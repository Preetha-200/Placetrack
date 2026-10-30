import fs from 'node:fs';
import path from 'node:path';

const filePath = path.resolve('src/lib/student/codingProblemsData.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Mask hidden test cases
content = content.replace(/input:\s*'([^']*)',\s*expectedOutput:\s*'([^']*)',\s*isHidden:\s*true/g, "input: '[Hidden testcase]', expectedOutput: '[Hidden testcase]', isHidden: true");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Successfully masked hidden testcase inputs and outputs in client codingProblemsData.ts');
