import os
import json
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from models import db, Analysis
from utils.parser import parse_resume
from utils.nlp import analyze_resume

analyze_bp = Blueprint('analyze', __name__, url_prefix='/api')

# Maximum characters to persist from resume/JD text (keeps DB rows manageable)
_MAX_RESUME_CHARS = 5000
_MAX_JD_CHARS = 3000


def allowed_file(filename, allowed_extensions):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions


@analyze_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze():
    user_id = int(get_jwt_identity())

    if 'resume' not in request.files:
        return jsonify({'error': 'No resume file provided'}), 400

    file = request.files['resume']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    allowed = current_app.config['ALLOWED_EXTENSIONS']
    if not allowed_file(file.filename, allowed):
        return jsonify({'error': 'File type not allowed. Use PDF or DOCX'}), 400

    job_description = request.form.get('job_description', '').strip()
    job_title = request.form.get('job_title', '').strip()

    if not job_description:
        return jsonify({'error': 'Job description is required'}), 400

    # Save uploaded file
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    original_filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    filepath = os.path.join(upload_folder, unique_name)
    file.save(filepath)

    try:
        resume_text = parse_resume(filepath)
        if not resume_text or len(resume_text.strip()) < 50:
            return jsonify({'error': 'Could not extract text from resume. Ensure the file is not image-only.'}), 422

        result = analyze_resume(resume_text, job_description)

        analysis = Analysis(
            user_id=user_id,
            filename=original_filename,
            job_title=job_title or None,
            ats_score=result['ats_score'],
            semantic_score=result['semantic_score'],
            keyword_score=result['keyword_score'],
            matched_keywords=json.dumps(result['matched_keywords']),
            missing_keywords=json.dumps(result['missing_keywords']),
            suggestions=json.dumps(result['suggestions']),
            resume_text=resume_text[:_MAX_RESUME_CHARS],
            job_description=job_description[:_MAX_JD_CHARS],
        )
        db.session.add(analysis)
        db.session.commit()

        return jsonify({
            'message': 'Analysis complete',
            'analysis': analysis.to_dict(),
        }), 201

    except ValueError as e:
        current_app.logger.warning(f'Analysis validation error: {e}')
        return jsonify({'error': str(e)}), 422
    except Exception as e:
        current_app.logger.error(f'Analysis error: {e}', exc_info=True)
        return jsonify({'error': 'Analysis failed. Please check your file and try again.'}), 500
    finally:
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)


@analyze_bp.route('/analyses', methods=['GET'])
@jwt_required()
def get_analyses():
    user_id = int(get_jwt_identity())
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)

    pagination = (
        Analysis.query
        .filter_by(user_id=user_id)
        .order_by(Analysis.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    return jsonify({
        'analyses': [a.to_dict() for a in pagination.items],
        'total': pagination.total,
        'pages': pagination.pages,
        'current_page': page,
    })


@analyze_bp.route('/analyses/<int:analysis_id>', methods=['GET'])
@jwt_required()
def get_analysis(analysis_id):
    user_id = int(get_jwt_identity())
    analysis = Analysis.query.filter_by(id=analysis_id, user_id=user_id).first()
    if not analysis:
        return jsonify({'error': 'Analysis not found'}), 404
    return jsonify({'analysis': analysis.to_dict()})


@analyze_bp.route('/analyses/<int:analysis_id>', methods=['DELETE'])
@jwt_required()
def delete_analysis(analysis_id):
    user_id = int(get_jwt_identity())
    analysis = Analysis.query.filter_by(id=analysis_id, user_id=user_id).first()
    if not analysis:
        return jsonify({'error': 'Analysis not found'}), 404
    db.session.delete(analysis)
    db.session.commit()
    return jsonify({'message': 'Analysis deleted'})


@analyze_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user_id = int(get_jwt_identity())
    analyses = Analysis.query.filter_by(user_id=user_id).all()

    if not analyses:
        return jsonify({
            'total': 0,
            'average_score': 0,
            'best_score': 0,
            'recent': [],
        })

    scores = [a.ats_score for a in analyses]
    recent = (
        Analysis.query
        .filter_by(user_id=user_id)
        .order_by(Analysis.created_at.desc())
        .limit(10)
        .all()
    )

    return jsonify({
        'total': len(analyses),
        'average_score': round(sum(scores) / len(scores), 2),
        'best_score': round(max(scores), 2),
        'recent': [
            {
                'id': a.id,
                'filename': a.filename,
                'job_title': a.job_title,
                'ats_score': round(a.ats_score, 2),
                'created_at': a.created_at.isoformat(),
            }
            for a in recent
        ],
    })
