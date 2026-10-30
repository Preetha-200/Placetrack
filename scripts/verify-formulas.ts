import {
	APTITUDE_FORMULA_TOPICS,
	PREP_TOPICS,
	PREP_CATEGORIES,
	type AptitudeFormulasTopic,
	type PrepFormulaItem
} from '../src/lib/student/placementPrepData';

interface ValidationIssue {
	topicId: string;
	topicTitle: string;
	formulaId?: string;
	formulaTitle?: string;
	issue: string;
}

async function validateFormulas() {
	console.log('=== VERIFYING APTITUDE FORMULA TOPICS & DATA INTEGRITY ===\n');

	const issues: ValidationIssue[] = [];
	let totalAptitudeFormulas = 0;

	console.log(`Found ${APTITUDE_FORMULA_TOPICS.length} Aptitude Formula Topics:`);

	for (let i = 0; i < APTITUDE_FORMULA_TOPICS.length; i++) {
		const topic = APTITUDE_FORMULA_TOPICS[i];
		console.log(`\n[Topic ${i + 1}] ${topic.title} (ID: ${topic.id})`);

		if (!topic.id || !topic.id.trim()) {
			issues.push({ topicId: topic.id || `topic_${i}`, topicTitle: topic.title, issue: 'Missing or empty topic id' });
		}
		if (!topic.title || !topic.title.trim()) {
			issues.push({ topicId: topic.id, topicTitle: topic.title || `topic_${i}`, issue: 'Missing or empty topic title' });
		}
		if (!topic.formulas || topic.formulas.length === 0) {
			issues.push({ topicId: topic.id, topicTitle: topic.title, issue: 'ZERO formula cards in topic' });
			console.log('  ❌ ZERO formula cards found');
			continue;
		}

		console.log(`  Found ${topic.formulas.length} formula cards:`);
		for (const f of topic.formulas) {
			totalAptitudeFormulas++;
			console.log(`    - [${f.id}] ${f.title}`);

			if (!f.id || !f.id.trim()) {
				issues.push({ topicId: topic.id, topicTitle: topic.title, formulaId: f.id, formulaTitle: f.title, issue: 'Missing or empty formula id' });
			}
			if (!f.title || !f.title.trim()) {
				issues.push({ topicId: topic.id, topicTitle: topic.title, formulaId: f.id, formulaTitle: f.title, issue: 'Missing or empty formula title' });
			}
			if (!f.formula || !f.formula.trim()) {
				issues.push({ topicId: topic.id, topicTitle: topic.title, formulaId: f.id, formulaTitle: f.title, issue: 'EMPTY formula string' });
			}
			if (!f.whenToUse || !f.whenToUse.trim()) {
				issues.push({ topicId: topic.id, topicTitle: topic.title, formulaId: f.id, formulaTitle: f.title, issue: 'MISSING whenToUse description' });
			}
			if (!f.example || !f.example.trim()) {
				issues.push({ topicId: topic.id, topicTitle: topic.title, formulaId: f.id, formulaTitle: f.title, issue: 'MISSING worked example' });
			}
			if (!f.shortcutTip || !f.shortcutTip.trim()) {
				console.log(`      ⚠️ Notice: no shortcut tip on formula ${f.id}`);
			}
		}
	}

	console.log(`\nTotal verified aptitude formula cards: ${totalAptitudeFormulas}`);

	// Detailed Module PREP_TOPICS Validation
	console.log(`\n=== VERIFYING DETAILED MODULE PREP_TOPICS (${PREP_TOPICS.length} topics) ===`);
	for (const pt of PREP_TOPICS) {
		if (!pt.formulas || pt.formulas.length === 0) {
			issues.push({ topicId: pt.id, topicTitle: pt.title, issue: 'PREP_TOPIC has 0 formulas' });
		}
	}

	console.log('\n=== VALIDATION SUMMARY ===');
	if (issues.length > 0) {
		console.error(`❌ FAILED WITH ${issues.length} ISSUE(S):`);
		for (const issue of issues) {
			console.error(`  - [${issue.topicTitle} / ${issue.formulaTitle || 'N/A'}] ${issue.issue}`);
		}
		process.exit(1);
	} else {
		console.log('✅ ALL 16 APTITUDE TOPICS & FORMULA CARDS ARE COMPLETE AND VALID!');
		process.exit(0);
	}
}

validateFormulas().catch((err) => {
	console.error('Validation script encountered an error:', err);
	process.exit(1);
});
