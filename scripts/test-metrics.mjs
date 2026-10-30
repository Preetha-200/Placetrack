import { studentStore } from '../src/lib/student/store.svelte.js';
import { evaluateQuizAttempt, QUESTION_BANK } from '../src/lib/student/quizData.js';

// Setup minimal localStorage mock for Node environment
const storeMap = new Map();
globalThis.localStorage = {
	getItem: (key) => storeMap.get(key) || null,
	setItem: (key, val) => storeMap.set(key, val),
	removeItem: (key) => storeMap.delete(key),
	clear: () => storeMap.clear()
};
globalThis.window = {};

console.log('--- 1. Testing Default / Empty State ---');
console.log('Quizzes Attempted:', studentStore.totalQuizzesAttempted, '(Expected: 0)');
console.log('Overall Readiness:', studentStore.overallReadinessScore, '(Expected: null)');
console.log('Average Accuracy:', studentStore.averageAccuracy, '(Expected: 0)');
console.log('Pass Streak:', studentStore.passStreak, '(Expected: 0)');
console.log('Placement Standing:', studentStore.placementStanding, '(Expected: No data yet)');
console.log('Strongest Topic:', studentStore.strongestTopic, '(Expected: null)');
console.log('Weakest Topic:', studentStore.weakestTopic, '(Expected: null)');
console.log('Aptitude Quizzes Completed:', studentStore.skills.aptitude.quizzesCompleted, '(Expected: 0)');
console.log('Trainer Tasks Count:', studentStore.trainerTasks.length, '(Expected: 0)');

if (
	studentStore.totalQuizzesAttempted !== 0 ||
	studentStore.overallReadinessScore !== null ||
	studentStore.averageAccuracy !== 0 ||
	studentStore.passStreak !== 0 ||
	studentStore.placementStanding !== 'No data yet' ||
	studentStore.strongestTopic !== null ||
	studentStore.trainerTasks.length !== 0
) {
	console.error('FAILED Initial state check!');
	process.exit(1);
}
console.log('PASS: Initial state is completely clean with 0 demo data!\n');

console.log('--- 2. Taking Quiz 1: Quantitative Aptitude ---');
// Pick 5 aptitude beginner questions from QUESTION_BANK
const aptQuestions = QUESTION_BANK.filter(q => q.category === 'aptitude' && q.level === 'Beginner').slice(0, 5);
console.log(`Using ${aptQuestions.length} Aptitude questions:`, aptQuestions.map(q => `${q.id} (${q.topic})`));

// Answer 4 correctly and 1 incorrectly
const aptAnswers = aptQuestions.map((q, idx) => ({
	questionId: q.id,
	selectedOption: idx === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex // 1 wrong, 4 right
}));

const aptResult = evaluateQuizAttempt({
	category: 'aptitude',
	currentLevel: 'Beginner',
	answers: aptAnswers,
	timeSpentSeconds: 125
});

console.log(`Quiz 1 Result: Score = ${aptResult.score}/${aptResult.totalQuestions} (${aptResult.percentage}%), Level: ${aptResult.levelBefore} -> ${aptResult.levelAfter}`);
studentStore.recordQuizResult(aptResult);

console.log('After Quiz 1:');
console.log('Total Quizzes Attempted:', studentStore.totalQuizzesAttempted, '(Expected: 1)');
console.log('Overall Readiness Score:', studentStore.overallReadinessScore, '(Expected: 80)');
console.log('Average Accuracy:', studentStore.averageAccuracy, '(Expected: 80)');
console.log('Pass Streak:', studentStore.passStreak, '(Expected: 1)');
console.log('Placement Standing:', studentStore.placementStanding, '(Expected: Placement Ready)');
console.log('Strongest Topic:', studentStore.strongestTopic?.topic, `(${studentStore.strongestTopic?.accuracy}%)`);
console.log('Weakest Topic:', studentStore.weakestTopic?.topic, `(${studentStore.weakestTopic?.accuracy}%)`);
console.log('Aptitude Category Score:', studentStore.skills.aptitude.score, '(Expected: 80)');
console.log('Aptitude Trend:', studentStore.getCategoryStats('aptitude').trend, '(Expected: [80])');

if (
	studentStore.totalQuizzesAttempted !== 1 ||
	studentStore.overallReadinessScore !== 80 ||
	studentStore.averageAccuracy !== 80 ||
	studentStore.passStreak !== 1 ||
	studentStore.placementStanding !== 'Placement Ready' ||
	studentStore.skills.aptitude.score !== 80
) {
	console.error('FAILED Quiz 1 assertions!');
	process.exit(1);
}
console.log('PASS: Quiz 1 metrics recorded and derived accurately!\n');

console.log('--- 3. Taking Quiz 2: Verbal Ability ---');
// Pick 5 verbal beginner questions from QUESTION_BANK
const verbalQuestions = QUESTION_BANK.filter(q => q.category === 'verbal' && q.level === 'Beginner').slice(0, 5);
console.log(`Using ${verbalQuestions.length} Verbal questions:`, verbalQuestions.map(q => `${q.id} (${q.topic})`));

// Answer 3 correctly and 2 incorrectly (60%)
const verbalAnswers = verbalQuestions.map((q, idx) => ({
	questionId: q.id,
	selectedOption: idx < 3 ? q.correctIndex : (q.correctIndex + 1) % 4
}));

const verbalResult = evaluateQuizAttempt({
	category: 'verbal',
	currentLevel: 'Beginner',
	answers: verbalAnswers,
	timeSpentSeconds: 95
});

console.log(`Quiz 2 Result: Score = ${verbalResult.score}/${verbalResult.totalQuestions} (${verbalResult.percentage}%), Level: ${verbalResult.levelBefore} -> ${verbalResult.levelAfter}`);
studentStore.recordQuizResult(verbalResult);

console.log('After Quiz 2:');
console.log('Total Quizzes Attempted:', studentStore.totalQuizzesAttempted, '(Expected: 2)');
console.log('Aptitude Score:', studentStore.skills.aptitude.score, '(Expected: 80)');
console.log('Verbal Score:', studentStore.skills.verbal.score, '(Expected: 60)');
// Overall readiness = average of categories with >= 1 attempt: (80 + 60) / 2 = 70
console.log('Overall Readiness Score:', studentStore.overallReadinessScore, '(Expected: 70)');
// Total correct = 4 + 3 = 7 out of 10 = 70%
console.log('Average Accuracy:', studentStore.averageAccuracy, '(Expected: 70)');
console.log('Pass Streak:', studentStore.passStreak, '(Expected: 2, since 80% and 60% both >= 60%)');
console.log('Placement Standing:', studentStore.placementStanding, '(Expected: Proficient for 70%)');
console.log('Average Time Per Quiz:', studentStore.averageTimePerQuiz, `(Expected: ~1m 50s, 110s)`);
console.log('Strongest Topic:', studentStore.strongestTopic?.topic, `(${studentStore.strongestTopic?.accuracy}%)`);
console.log('Weakest Topic:', studentStore.weakestTopic?.topic, `(${studentStore.weakestTopic?.accuracy}%)`);
console.log('Aptitude Trend:', studentStore.getCategoryStats('aptitude').trend, '(Expected: [80])');
console.log('Verbal Trend:', studentStore.getCategoryStats('verbal').trend, '(Expected: [60])');
console.log('Logical Trend:', studentStore.getCategoryStats('logical').trend, '(Expected: [])');

if (
	studentStore.totalQuizzesAttempted !== 2 ||
	studentStore.skills.aptitude.score !== 80 ||
	studentStore.skills.verbal.score !== 60 ||
	studentStore.overallReadinessScore !== 70 ||
	studentStore.averageAccuracy !== 70 ||
	studentStore.passStreak !== 2 ||
	studentStore.placementStanding !== 'Proficient' ||
	studentStore.getCategoryStats('logical').hasAttempts !== false
) {
	console.error('FAILED Quiz 2 assertions!');
	process.exit(1);
}
console.log('PASS: Quiz 2 metrics match calculations exactly!\n');

console.log('--- 4. Testing Persistence / Refresh Simulation ---');
// Verify localStorage contains the saved items
const savedHist = localStorage.getItem('placetrack_student_usr_student_01_history');
console.log('Saved history items in localStorage:', JSON.parse(savedHist).length, '(Expected: 2)');

// Clear in-memory history and reload via init()
studentStore.history = [];
studentStore.skills.aptitude.score = 0;
studentStore.skills.verbal.score = 0;
studentStore.init('usr_student_01');

console.log('After reloading from localStorage:');
console.log('Total Quizzes Attempted:', studentStore.totalQuizzesAttempted, '(Expected: 2)');
console.log('Overall Readiness Score:', studentStore.overallReadinessScore, '(Expected: 70)');
console.log('Average Accuracy:', studentStore.averageAccuracy, '(Expected: 70)');
console.log('Pass Streak:', studentStore.passStreak, '(Expected: 2)');
console.log('Aptitude Score:', studentStore.skills.aptitude.score, '(Expected: 80)');
console.log('Verbal Score:', studentStore.skills.verbal.score, '(Expected: 60)');
console.log('Strongest Topic:', studentStore.strongestTopic?.topic, `(${studentStore.strongestTopic?.accuracy}%)`);
console.log('Weakest Topic:', studentStore.weakestTopic?.topic, `(${studentStore.weakestTopic?.accuracy}%)`);

if (
	studentStore.totalQuizzesAttempted !== 2 ||
	studentStore.overallReadinessScore !== 70 ||
	studentStore.skills.aptitude.score !== 80 ||
	studentStore.skills.verbal.score !== 60
) {
	console.error('FAILED Persistence assertions!');
	process.exit(1);
}

console.log('\n========================================');
console.log('ALL METRICS AND CALCULATIONS VERIFIED SUCCESSFULLY!');
console.log('========================================');
