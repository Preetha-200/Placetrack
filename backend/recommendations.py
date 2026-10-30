"""
Placement Readiness Recommendation Engine.
Implements the rules specified:
- If a student's Verbal score is low, recommend verbal assessments, grammar practice and reading comprehension.
- If Aptitude is low, recommend quantitative aptitude and problem-solving practice.
- If Technical skills are low, recommend technical assessments and programming practice.
- If Logical is low, recommend logical reasoning and puzzle solving drills.
- If completion rate is low, recommend completing pending assigned assessments.
"""

from typing import Dict, Any, List

SKILL_NAMES = {
    'aptitude_score': 'Quantitative Aptitude',
    'verbal_score': 'Verbal Ability',
    'logical_score': 'Logical Reasoning',
    'technical_score': 'Technical Skills',
    'mock_interview_score': 'Mock Interview',
    'completion_rate': 'Assessment Completion Rate',
    'historical_performance': 'Historical Assessment Performance'
}

def analyze_skills(features: Dict[str, float]) -> Dict[str, Any]:
    # Core domain skills
    domain_skills = {
        'Quantitative Aptitude': features.get('aptitude_score', 0.0),
        'Verbal Ability': features.get('verbal_score', 0.0),
        'Logical Reasoning': features.get('logical_score', 0.0),
        'Technical Skills': features.get('technical_score', 0.0)
    }

    # Sort skills by score descending
    sorted_skills = sorted(domain_skills.items(), key=lambda x: x[1], reverse=True)

    strongest = []
    weakest = []

    for name, score in sorted_skills:
        status = 'Strong' if score >= 75 else 'Moderate' if score >= 60 else 'Needs Improvement'
        item = {'skill': name, 'score': round(score, 1), 'status': status}
        if score >= 70:
            strongest.append(item)
        if score < 75:
            weakest.append(item)

    # Ensure at least 1 strongest and 1 weakest for clear diagnostics
    if not strongest and sorted_skills:
        top_name, top_score = sorted_skills[0]
        strongest.append({'skill': top_name, 'score': round(top_score, 1), 'status': 'Moderate' if top_score >= 60 else 'Needs Improvement'})

    if not weakest and sorted_skills:
        lowest_name, lowest_score = sorted_skills[-1]
        weakest.append({'skill': lowest_name, 'score': round(lowest_score, 1), 'status': 'Moderate' if lowest_score >= 60 else 'Needs Improvement'})

    # Reverse weakest so lowest is first
    weakest = sorted(weakest, key=lambda x: x['score'])

    return {
        'strongest_skills': strongest,
        'weakest_skills': weakest
    }

def generate_recommendations(features: Dict[str, float], readiness_category: str) -> Dict[str, Any]:
    aptitude = features.get('aptitude_score', 0.0)
    verbal = features.get('verbal_score', 0.0)
    logical = features.get('logical_score', 0.0)
    technical = features.get('technical_score', 0.0)
    completion = features.get('completion_rate', 0.0)
    mock = features.get('mock_interview_score', 0.0)

    recommendations: List[Dict[str, str]] = []
    suggested_assessments: List[Dict[str, str]] = []

    # 1. Verbal recommendation rule
    if verbal < 75:
        recommendations.append({
            'domain': 'Verbal Ability',
            'priority': 'High' if verbal < 60 else 'Medium',
            'action': 'Engage in dedicated grammar drills, error detection in syntax, and reading comprehension passages.',
            'study_guide': 'Master Verbal Ability & English Vocabulary Handbook',
            'focus_topics': 'Subject-Verb Agreement, Idiomatic Phrases, Critical Reading Speed'
        })
        suggested_assessments.append({
            'title': 'Verbal Ability: Sentence Correction & Critical Vocabulary',
            'category': 'Verbal',
            'type': 'Practice MCQ Drill',
            'reason': f'Current verbal score is {round(verbal, 1)}% (Target: ≥75%).'
        })

    # 2. Aptitude recommendation rule
    if aptitude < 75:
        recommendations.append({
            'domain': 'Quantitative Aptitude',
            'priority': 'High' if aptitude < 60 else 'Medium',
            'action': 'Strengthen core speed-math techniques, relative speed, and time-and-work equations.',
            'study_guide': 'Quantitative Aptitude Master Formula Handbook & Shortcut Guide',
            'focus_topics': 'Time & Work, Relative Speed, Percentages & Profit/Loss'
        })
        suggested_assessments.append({
            'title': 'Quantitative Aptitude: Time, Work & Relative Speed Drill',
            'category': 'Aptitude',
            'type': 'Timed Numerical Test',
            'reason': f'Current aptitude score is {round(aptitude, 1)}% (Target: ≥75%).'
        })

    # 3. Technical recommendation rule
    if technical < 75:
        recommendations.append({
            'domain': 'Technical Skills',
            'priority': 'High' if technical < 60 else 'Medium',
            'action': 'Practice algorithmic problem solving, DBMS normalization, indexing, and SQL queries.',
            'study_guide': 'Full Stack MCA Technical Interview Question Bank & System Design Cheat Sheet',
            'focus_topics': 'Binary Search Trees, DBMS ACID Transactions, SQL Query Optimization'
        })
        suggested_assessments.append({
            'title': 'Technical Core: DBMS, SQL & Algorithm Complexity',
            'category': 'Technical',
            'type': 'Technical Screening',
            'reason': f'Current technical score is {round(technical, 1)}% (Target: ≥75%).'
        })

    # 4. Logical Reasoning recommendation rule
    if logical < 75:
        recommendations.append({
            'domain': 'Logical Reasoning',
            'priority': 'Medium',
            'action': 'Practice circular seating arrangement puzzles, syllogisms, and coding-decoding patterns.',
            'study_guide': 'Logical Reasoning & Analytical Deduction Handbook',
            'focus_topics': 'Syllogisms, Seating Arrangements, Direction Sense'
        })
        suggested_assessments.append({
            'title': 'Logical Reasoning: Syllogisms & Seating Arrangements',
            'category': 'Logical Reasoning',
            'type': 'Analytical Puzzle Set',
            'reason': f'Current logical reasoning score is {round(logical, 1)}% (Target: ≥75%).'
        })

    # 5. Assessment Completion Rate recommendation
    if completion < 70:
        recommendations.append({
            'domain': 'Assessment Discipline',
            'priority': 'High' if completion < 50 else 'Medium',
            'action': f'Complete remaining pending assessments. Current completion is {round(completion, 1)}%. High test completion correlates directly with placement drive clearance.',
            'study_guide': 'PlaceTrack Weekly Campus Mock Calendar',
            'focus_topics': 'Assigned Batch Mock Tests'
        })

    # Fallback if student is strong across all domains
    if not recommendations:
        recommendations.append({
            'domain': 'Advanced Placement Excellence',
            'priority': 'Low',
            'action': 'Maintain consistency by attempting advanced full mock simulation tests and mock interviews.',
            'study_guide': 'Tier-1 High Package Placement Drive Preparation Guide',
            'focus_topics': 'Advanced System Design, Mock Technical Viva, Company Specific Prep'
        })
        suggested_assessments.append({
            'title': 'AI Assessment: Machine Learning & Deep Neural Foundations',
            'category': 'AI',
            'type': 'Advanced Benchmark',
            'reason': 'Maintain competitive readiness for Tier-1 placements.'
        })

    return {
        'recommendations': recommendations,
        'suggested_assessments': suggested_assessments
    }
