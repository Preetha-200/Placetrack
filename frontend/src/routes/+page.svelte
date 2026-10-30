<script lang="ts">
	let selectedRole = $state('');

	const features = [
		{
			number: '01',
			title: 'Track Performance',
			description:
				'Monitor technical, aptitude, and verbal performance from one centralized platform.'
		},
		{
			number: '02',
			title: 'Smart Learning',
			description:
				'Access learning materials, assignments, and assessments in a structured environment.'
		},
		{
			number: '03',
			title: 'AI Insights',
			description:
				'Receive intelligent performance analysis and personalized recommendations.'
		}
	];

	const roles = [
		{
			id: 'student',
			title: 'MCA Student',
			icon: 'MCA',
			description:
				'Track your technical competency, solve adaptive placement tests, and calibrate readiness for top software company drives.',
			button: 'MCA Student Login',
			path: '/login?role=student'
		},
		{
			id: 'trainer',
			title: 'MCA Technical Trainer',
			icon: 'TR',
			description:
				'Manage MCA batches, assign targeted aptitude & coding drills, dispatch mock assessments, and mentor student progress.',
			button: 'MCA Trainer Login',
			path: '/login?role=trainer'
		},
		{
			id: 'coordinator',
			title: 'MCA Placement Coordinator',
			icon: 'PC',
			description:
				'Supervise MCA placement statistics, schedule company drives, monitor eligibility, and generate departmental placement reports.',
			button: 'MCA Coordinator Login',
			path: '/login?role=coordinator'
		}
	];
</script>

<svelte:head>
	<title>Placement tracker a web based student trainer interaction platform</title>
	<meta
		name="description"
		content="Placement tracker a web based student trainer interaction platform"
	/>
</svelte:head>

<header class="navbar">
	<a href="/" class="logo">
		<div class="logo-mark">P</div>
		<div>
			<h1>Placement Tracker</h1>
			<span>A Web Based Student Trainer Interaction Platform</span>
		</div>
	</a>

	<nav>
		<a href="#home">Home</a>
		<a href="#features">Features</a>
		<a href="#roles">Portal Access</a>
		<a href="#about">About</a>
	</nav>

	<a href="#roles" class="login-button">Login</a>
</header>

<main>
	<section class="hero" id="home">
		<div class="hero-content">
			<div class="badge">
				<span>MCA</span>
				DEPARTMENT OF COMPUTER APPLICATIONS
			</div>

			<h2>
				Prepare Better.
				<span>Perform Smarter.</span>
				Achieve More.
			</h2>

			<p>
				A centralized AI-driven platform dedicated to the <strong>MCA Department</strong> that connects postgraduate candidates, technical trainers,
				and the placement coordinator to improve placement preparation through adaptive assessments, performance tracking, and intelligent insights.
			</p>

			<div class="hero-buttons">
				<a href="#roles" class="primary-button">Access Your Portal</a>
				<a href="#features" class="secondary-button">Explore Platform</a>
			</div>

			<div class="hero-stats">
				<div>
					<strong>3</strong>
					<span>User Portals</span>
				</div>

				<div>
					<strong>AI</strong>
					<span>Smart Insights</span>
				</div>

				<div>
					<strong>360°</strong>
					<span>Performance Tracking</span>
				</div>
			</div>
		</div>

		<div class="hero-visual">
			<div class="visual-background"></div>

			<div class="main-visual-card">
				<div class="visual-header">
					<div class="visual-logo">P</div>
					<div>
						<strong>Performance Overview</strong>
						<span>Placement Readiness</span>
					</div>
					<div class="live-dot">Live</div>
				</div>

				<div class="score-area">
					<div class="score-circle">
						<div>
							<strong>82%</strong>
							<span>Overall Score</span>
						</div>
					</div>

					<div class="score-details">
						<div class="score-row">
							<span>Technical Skills</span>
							<strong>86%</strong>
						</div>
						<div class="progress">
							<div class="progress-bar technical"></div>
						</div>

						<div class="score-row">
							<span>Aptitude</span>
							<strong>78%</strong>
						</div>
						<div class="progress">
							<div class="progress-bar aptitude"></div>
						</div>

						<div class="score-row">
							<span>Verbal Ability</span>
							<strong>82%</strong>
						</div>
						<div class="progress">
							<div class="progress-bar verbal"></div>
						</div>
					</div>
				</div>

				<div class="mini-chart">
					<div class="chart-title">
						<span>Performance Growth</span>
						<strong>+12.5%</strong>
					</div>

					<div class="chart-bars">
						<div style="height: 38%"></div>
						<div style="height: 52%"></div>
						<div style="height: 45%"></div>
						<div style="height: 68%"></div>
						<div style="height: 74%"></div>
						<div style="height: 90%"></div>
					</div>
				</div>
			</div>

			<div class="floating-card assessment-card">
				<div class="floating-icon">✓</div>
				<div>
					<strong>24 Assessments</strong>
					<span>Completed</span>
				</div>
			</div>

			<div class="floating-card ai-card">
				<div class="floating-icon">AI</div>
				<div>
					<strong>AI Recommendation</strong>
					<span>Ready for review</span>
				</div>
			</div>
		</div>
	</section>

	<section class="features-section" id="features">
		<div class="section-heading">
			<span>WHY PLACETRACK AI</span>
			<h2>Everything needed for better placement preparation</h2>
			<p>
				One platform for learning, assessment, performance management, and intelligent decision-making.
			</p>
		</div>

		<div class="features-grid">
			{#each features as feature}
				<div class="feature-card">
					<div class="feature-number">{feature.number}</div>
					<h3>{feature.title}</h3>
					<p>{feature.description}</p>
					<div class="feature-arrow">→</div>
				</div>
			{/each}
		</div>
	</section>

	<section class="roles-section" id="roles">
		<div class="section-heading">
			<span>PORTAL ACCESS</span>
			<h2>Choose your role to continue</h2>
			<p>Select the portal designed specifically for your responsibilities.</p>
		</div>

		<div class="roles-grid">
			{#each roles as role}
				<div
					class:selected={selectedRole === role.id}
					class="role-card"
					onclick={() => (selectedRole = role.id)}
					onkeydown={(event) => {
						if (event.key === 'Enter' || event.key === ' ') {
							selectedRole = role.id;
						}
					}}
					role="button"
					tabindex="0"
				>
					<div class="role-top">
						<div class={`role-icon ${role.id}`}>{role.icon}</div>
						<div class="role-check">✓</div>
					</div>

					<h3>{role.title}</h3>
					<p>{role.description}</p>

					<a href={role.path} class="role-button" onclick={(event) => event.stopPropagation()}>
						{role.button}
						<span>→</span>
					</a>
				</div>
			{/each}
		</div>
	</section>

	<section class="ai-section" id="about">
		<div class="ai-text">
			<span>POWERED BY INTELLIGENT ANALYSIS</span>
			<h2>Your placement preparation, guided by data.</h2>
			<p>
				Combine technical, aptitude, verbal, and learning performance into one clear picture.
				The AI module helps identify strengths, weak areas, and the next best steps for improvement.
			</p>

			<div class="ai-points">
				<div>
					<div>✓</div>
					<span>Personalized performance feedback</span>
				</div>
				<div>
					<div>✓</div>
					<span>Weak-area identification</span>
				</div>
				<div>
					<div>✓</div>
					<span>Structured learning recommendations</span>
				</div>
			</div>
		</div>

		<div class="ai-visual">
			<div class="insight-card">
				<div class="insight-header">
					<div>
						<span>AI INSIGHT</span>
						<h3>Performance Analysis</h3>
					</div>
					<div class="sparkle">AI</div>
				</div>

				<div class="insight-item strength">
					<div class="insight-symbol">↑</div>
					<div>
						<strong>Strong Area</strong>
						<p>Programming and Data Structures</p>
					</div>
					<span>86%</span>
				</div>

				<div class="insight-item improvement">
					<div class="insight-symbol">!</div>
					<div>
						<strong>Improve Further</strong>
						<p>Quantitative Aptitude</p>
					</div>
					<span>78%</span>
				</div>

				<div class="recommendation-box">
					<span>RECOMMENDED NEXT STEP</span>
					<p>Practice percentages and probability for 30 minutes daily.</p>
				</div>
			</div>
		</div>
	</section>
</main>

<footer>
	<div class="footer-logo">
		<div class="footer-mark">P</div>
		<div>
			<strong>Placement Tracker</strong>
			<span>A Web Based Student Trainer Interaction Platform</span>
		</div>
	</div>

	<p>Placement Tracker - A Web Based Student Trainer Interaction Platform</p>
</footer>

<style>
	:global(*) {
		box-sizing: border-box;
		scroll-behavior: smooth;
	}

	:global(body) {
		margin: 0;
		font-family: 'Plus Jakarta Sans', Inter, Arial, Helvetica, sans-serif;
		color: var(--text-body, #0b2545);
		background: var(--bg-page, #f3f9fd);
	}

	:global(a) {
		text-decoration: none;
	}

	.navbar {
		height: 78px;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 7%;
		background: #ffffff;
		border-bottom: 1px solid var(--border-subtle, #cce7f7);
		box-shadow: 0 2px 10px rgba(6, 23, 46, 0.04);
		position: sticky;
		top: 0;
		z-index: 100;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--navy-dark, #06172e);
	}

	.logo-mark,
	.footer-mark {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, #0f4c81 0%, #58a1d3 100%);
		color: white;
		font-weight: 800;
		font-size: 20px;
		box-shadow: 0 4px 14px rgba(15, 76, 129, 0.28);
	}

	.logo h1 {
		margin: 0;
		font-size: 19px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.logo span {
		display: block;
		margin-top: 3px;
		font-size: 10px;
		color: var(--text-muted, #486b88);
		font-weight: 600;
	}

	nav {
		display: flex;
		gap: 30px;
	}

	nav a {
		color: var(--text-muted, #486b88);
		font-size: 13px;
		font-weight: 600;
		transition: color 0.2s ease;
	}

	nav a:hover {
		color: var(--blue-primary, #0f4c81);
	}

	.login-button,
	.primary-button {
		background: linear-gradient(135deg, #0f4c81 0%, #1a5fa0 100%);
		color: white;
		border-radius: 10px;
		padding: 11px 20px;
		font-size: 12px;
		font-weight: 700;
		box-shadow: 0 4px 14px rgba(15, 76, 129, 0.28);
		transition: all 0.2s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.login-button:hover,
	.primary-button:hover {
		background: #06172e;
		transform: translateY(-1px);
		box-shadow: 0 6px 18px rgba(6, 23, 46, 0.3);
	}

	.hero {
		min-height: 650px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 50px;
		padding: 70px 7%;
		overflow: hidden;
	}

	.hero-content {
		max-width: 620px;
	}

	.badge {
		width: fit-content;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px 6px 6px;
		border-radius: 20px;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.6px;
		border: 1px solid var(--border-subtle, #cce7f7);
	}

	.badge span {
		width: 27px;
		height: 27px;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: var(--blue-primary, #0f4c81);
		color: white;
		font-size: 9px;
		box-shadow: 0 2px 6px rgba(15, 76, 129, 0.3);
	}

	.hero h2 {
		margin: 24px 0 18px;
		font-size: clamp(42px, 5vw, 68px);
		line-height: 1.08;
		letter-spacing: -2px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.hero h2 span {
		display: block;
		background: linear-gradient(135deg, #0f4c81 0%, #58a1d3 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.hero-content > p {
		max-width: 570px;
		font-size: 16px;
		line-height: 1.75;
		color: var(--text-body, #0b2545);
	}

	.hero-buttons {
		display: flex;
		gap: 12px;
		margin-top: 28px;
	}

	.primary-button {
		padding: 14px 24px;
		font-size: 13px;
	}

	.secondary-button {
		padding: 13px 22px;
		border: 1.5px solid var(--border-subtle, #cce7f7);
		border-radius: 10px;
		color: var(--blue-primary, #0f4c81);
		font-size: 13px;
		font-weight: 700;
		background: white;
		transition: all 0.2s ease;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.secondary-button:hover {
		background: var(--ice-tint, #e6f4fc);
		border-color: var(--cyan-vibrant, #58a1d3);
		transform: translateY(-1px);
	}

	.hero-stats {
		display: flex;
		gap: 38px;
		margin-top: 45px;
	}

	.hero-stats div {
		padding-right: 35px;
		border-right: 1px solid var(--border-subtle, #cce7f7);
	}

	.hero-stats div:last-child {
		border: 0;
		padding: 0;
	}

	.hero-stats strong,
	.hero-stats span {
		display: block;
	}

	.hero-stats strong {
		font-size: 24px;
		color: var(--blue-primary, #0f4c81);
		font-weight: 800;
	}

	.hero-stats span {
		margin-top: 4px;
		color: var(--text-muted, #486b88);
		font-size: 11px;
		font-weight: 600;
	}

	.hero-visual {
		position: relative;
		min-height: 480px;
		display: grid;
		place-items: center;
	}

	.visual-background {
		position: absolute;
		width: 440px;
		height: 440px;
		border-radius: 50%;
		background: radial-gradient(circle, #b3def8 0%, rgba(179, 222, 248, 0.45) 55%, transparent 75%);
	}

	.main-visual-card {
		position: relative;
		z-index: 2;
		width: min(100%, 460px);
		background: white;
		border: 1px solid var(--border-subtle, #cce7f7);
		border-radius: 22px;
		padding: 26px;
		box-shadow: 0 30px 70px rgba(6, 23, 46, 0.12);
	}

	.visual-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.visual-logo {
		width: 38px;
		height: 38px;
		display: grid;
		place-items: center;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
		border-radius: 10px;
		font-weight: 800;
	}

	.visual-header > div:nth-child(2) {
		flex: 1;
	}

	.visual-header strong,
	.visual-header span {
		display: block;
	}

	.visual-header strong {
		font-size: 13px;
		color: var(--navy-dark, #06172e);
	}

	.visual-header span {
		margin-top: 3px;
		font-size: 10px;
		color: var(--text-muted, #486b88);
	}

	.live-dot {
		padding: 5px 10px;
		border-radius: 12px;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81) !important;
		font-size: 10px !important;
		font-weight: 700;
		border: 1px solid var(--border-subtle, #cce7f7);
	}

	.score-area {
		display: flex;
		align-items: center;
		gap: 25px;
		margin: 28px 0;
	}

	.score-circle {
		width: 145px;
		height: 145px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: conic-gradient(#0f4c81 0deg 180deg, #58a1d3 180deg 295deg, #b3def8 295deg 360deg);
		box-shadow: 0 8px 24px rgba(15, 76, 129, 0.18);
	}

	.score-circle > div {
		width: 112px;
		height: 112px;
		border-radius: 50%;
		background: white;
		display: grid;
		place-items: center;
		align-content: center;
	}

	.score-circle strong {
		font-size: 28px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.score-circle span {
		margin-top: 4px;
		font-size: 10px;
		color: var(--text-muted, #486b88);
		font-weight: 600;
	}

	.score-details {
		flex: 1;
	}

	.score-row {
		display: flex;
		justify-content: space-between;
		margin-top: 10px;
		font-size: 11px;
		font-weight: 600;
		color: var(--navy-dark, #06172e);
	}

	.progress {
		height: 7px;
		margin-top: 6px;
		border-radius: 10px;
		background: var(--ice-tint, #e6f4fc);
		overflow: hidden;
	}

	.progress-bar {
		height: 100%;
		border-radius: inherit;
	}

	.technical {
		width: 86%;
		background: linear-gradient(90deg, #0f4c81 0%, #58a1d3 100%);
	}

	.aptitude {
		width: 78%;
		background: #58a1d3;
	}

	.verbal {
		width: 82%;
		background: #b3def8;
	}

	.mini-chart {
		border-top: 1px solid var(--border-subtle, #cce7f7);
		padding-top: 17px;
	}

	.chart-title {
		display: flex;
		justify-content: space-between;
		font-size: 11px;
		font-weight: 600;
		color: var(--text-muted, #486b88);
	}

	.chart-title strong {
		color: var(--blue-primary, #0f4c81);
	}

	.chart-bars {
		height: 70px;
		display: flex;
		align-items: flex-end;
		gap: 13px;
		margin-top: 13px;
	}

	.chart-bars div {
		flex: 1;
		border-radius: 5px 5px 0 0;
		background: var(--sky-soft, #b3def8);
		transition: transform 0.2s ease;
	}

	.chart-bars div:hover {
		transform: scaleY(1.05);
	}

	.chart-bars div:last-child {
		background: linear-gradient(180deg, #58a1d3 0%, #0f4c81 100%);
	}

	.floating-card {
		position: absolute;
		z-index: 3;
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 14px;
		background: white;
		border: 1px solid var(--border-subtle, #cce7f7);
		border-radius: 14px;
		box-shadow: 0 15px 35px rgba(6, 23, 46, 0.1);
	}

	.floating-card strong,
	.floating-card span {
		display: block;
	}

	.floating-card strong {
		font-size: 11px;
		color: var(--navy-dark, #06172e);
		font-weight: 700;
	}

	.floating-card span {
		margin-top: 2px;
		font-size: 9px;
		color: var(--text-muted, #486b88);
	}

	.floating-icon {
		width: 32px;
		height: 32px;
		display: grid;
		place-items: center;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
		border-radius: 9px;
		font-size: 11px;
		font-weight: 800;
	}

	.assessment-card {
		top: 80px;
		left: -10px;
	}

	.ai-card {
		bottom: 70px;
		right: -10px;
	}

	.features-section,
	.roles-section {
		padding: 90px 7%;
	}

	.features-section {
		background: white;
	}

	.section-heading {
		max-width: 650px;
		margin: 0 auto 45px;
		text-align: center;
	}

	.section-heading > span,
	.ai-text > span {
		color: var(--blue-primary, #0f4c81);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 1.4px;
	}

	.section-heading h2 {
		margin: 14px 0;
		font-size: 38px;
		letter-spacing: -1px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.section-heading p {
		margin: 0;
		color: var(--text-muted, #486b88);
		font-size: 15px;
		line-height: 1.7;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
		max-width: 1200px;
		margin: auto;
	}

	.feature-card {
		min-height: 240px;
		padding: 30px;
		border: 1px solid var(--border-subtle, #cce7f7);
		border-radius: 18px;
		background: #f3f9fd;
		transition: all 0.25s ease;
	}

	.feature-card:hover {
		transform: translateY(-4px);
		border-color: var(--cyan-vibrant, #58a1d3);
		box-shadow: 0 16px 36px rgba(6, 23, 46, 0.08);
		background: white;
	}

	.feature-number {
		color: var(--blue-primary, #0f4c81);
		font-size: 12px;
		font-weight: 800;
		letter-spacing: 0.5px;
	}

	.feature-card h3 {
		margin: 24px 0 10px;
		font-size: 20px;
		color: var(--navy-dark, #06172e);
		font-weight: 700;
	}

	.feature-card p {
		margin: 0;
		color: var(--text-body, #0b2545);
		font-size: 13.5px;
		line-height: 1.7;
	}

	.feature-arrow {
		margin-top: 25px;
		color: var(--cyan-vibrant, #58a1d3);
		font-size: 22px;
		transition: transform 0.2s ease;
	}

	.feature-card:hover .feature-arrow {
		transform: translateX(4px);
		color: var(--blue-primary, #0f4c81);
	}

	.roles-section {
		background: linear-gradient(180deg, #f3f9fd 0%, #e6f4fc 100%);
	}

	.roles-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 24px;
		max-width: 1200px;
		margin: auto;
	}

	.role-card {
		position: relative;
		padding: 28px;
		background: white;
		border: 2px solid var(--border-subtle, #cce7f7);
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.25s ease;
	}

	.role-card:hover,
	.role-card.selected {
		transform: translateY(-5px);
		border-color: var(--blue-primary, #0f4c81);
		box-shadow: 0 20px 40px rgba(6, 23, 46, 0.12);
	}

	.role-top {
		display: flex;
		justify-content: space-between;
	}

	.role-icon {
		width: 52px;
		height: 52px;
		border-radius: 15px;
		display: grid;
		place-items: center;
		font-size: 13px;
		font-weight: 800;
	}

	.role-icon.student {
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
	}

	.role-icon.trainer {
		background: var(--sky-soft, #b3def8);
		color: var(--blue-primary, #0f4c81);
	}

	.role-icon.coordinator {
		background: rgba(2, 44, 80, 0.1);
		color: var(--blue-slate, #022c50);
	}

	.role-check {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: white;
		background: var(--border-subtle, #cce7f7);
		font-size: 11px;
		transition: background 0.2s ease;
	}

	.selected .role-check {
		background: var(--blue-primary, #0f4c81);
	}

	.role-card h3 {
		margin: 22px 0 10px;
		font-size: 20px;
		color: var(--navy-dark, #06172e);
		font-weight: 700;
	}

	.role-card p {
		min-height: 85px;
		color: var(--text-body, #0b2545);
		font-size: 13px;
		line-height: 1.7;
	}

	.role-button {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 20px;
		padding: 12px 16px;
		border-radius: 10px;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
		font-size: 12px;
		font-weight: 800;
		transition: all 0.2s ease;
	}

	.role-button:hover {
		background: var(--blue-primary, #0f4c81);
		color: white;
	}

	.ai-section {
		max-width: 1200px;
		margin: auto;
		padding: 100px 30px;
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: center;
		gap: 70px;
	}

	.ai-text h2 {
		margin: 14px 0;
		font-size: 40px;
		line-height: 1.2;
		letter-spacing: -1px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.ai-text > p {
		color: var(--text-body, #0b2545);
		font-size: 15px;
		line-height: 1.8;
	}

	.ai-points {
		margin-top: 28px;
	}

	.ai-points > div {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 14px;
		font-size: 13px;
		color: var(--navy-dark, #06172e);
		font-weight: 600;
	}

	.ai-points > div > div {
		width: 24px;
		height: 24px;
		display: grid;
		place-items: center;
		background: var(--ice-tint, #e6f4fc);
		border-radius: 50%;
		color: var(--blue-primary, #0f4c81);
		font-size: 11px;
		font-weight: 800;
	}

	.ai-visual {
		padding: 32px;
		background: linear-gradient(140deg, #b3def8 0%, #e6f4fc 100%);
		border: 1px solid #cce7f7;
		border-radius: 28px;
	}

	.insight-card {
		background: white;
		padding: 26px;
		border-radius: 20px;
		box-shadow: 0 20px 45px rgba(6, 23, 46, 0.09);
		border: 1px solid var(--border-subtle, #cce7f7);
	}

	.insight-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.insight-header span {
		font-size: 10px;
		font-weight: 800;
		color: var(--blue-primary, #0f4c81);
		letter-spacing: 1px;
	}

	.insight-header h3 {
		margin: 6px 0 0;
		font-size: 18px;
		color: var(--navy-dark, #06172e);
		font-weight: 700;
	}

	.sparkle {
		width: 40px;
		height: 40px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, #0f4c81 0%, #58a1d3 100%);
		color: white;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 800;
		box-shadow: 0 4px 12px rgba(15, 76, 129, 0.3);
	}

	.insight-item {
		display: grid;
		grid-template-columns: 36px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 16px 0;
		border-bottom: 1px solid var(--border-subtle, #cce7f7);
	}

	.insight-symbol {
		width: 34px;
		height: 34px;
		display: grid;
		place-items: center;
		border-radius: 10px;
		font-weight: 800;
		font-size: 13px;
	}

	.strength .insight-symbol {
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
	}

	.improvement .insight-symbol {
		background: var(--sky-soft, #b3def8);
		color: var(--blue-primary, #0f4c81);
	}

	.insight-item strong,
	.insight-item p {
		display: block;
	}

	.insight-item strong {
		font-size: 12px;
		color: var(--navy-dark, #06172e);
	}

	.insight-item p {
		margin: 4px 0 0;
		color: var(--text-muted, #486b88);
		font-size: 11px;
	}

	.insight-item > span {
		font-size: 13px;
		font-weight: 800;
		color: var(--blue-primary, #0f4c81);
	}

	.recommendation-box {
		margin-top: 20px;
		padding: 16px;
		background: var(--ice-tint, #e6f4fc);
		border-radius: 12px;
		border: 1px solid var(--border-subtle, #cce7f7);
	}

	.recommendation-box span {
		font-size: 9px;
		color: var(--blue-primary, #0f4c81);
		font-weight: 800;
		letter-spacing: 1px;
	}

	.recommendation-box p {
		margin: 6px 0 0;
		font-size: 12px;
		line-height: 1.5;
		color: var(--navy-dark, #06172e);
		font-weight: 500;
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 32px 7%;
		background: var(--navy-dark, #06172e);
		color: white;
	}

	.footer-logo {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.footer-mark {
		background: linear-gradient(135deg, #0f4c81 0%, #58a1d3 100%);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.footer-logo strong,
	.footer-logo span {
		display: block;
	}

	.footer-logo strong {
		font-size: 14px;
		color: white;
	}

	.footer-logo span,
	footer > p {
		margin: 4px 0 0;
		font-size: 10px;
		color: var(--sky-soft, #b3def8);
	}

	@media (max-width: 1000px) {
		.hero,
		.ai-section {
			grid-template-columns: 1fr;
		}

		.hero-content {
			max-width: 100%;
		}

		.hero-visual {
			max-width: 600px;
			width: 100%;
			margin: auto;
		}

		.features-grid,
		.roles-grid {
			grid-template-columns: 1fr;
			max-width: 550px;
		}
	}

	@media (max-width: 700px) {
		.navbar {
			padding: 0 5%;
		}

		nav {
			display: none;
		}

		.hero {
			padding: 50px 6%;
		}

		.hero h2 {
			font-size: 43px;
		}

		.hero-stats {
			gap: 15px;
		}

		.hero-stats div {
			padding-right: 15px;
		}

		.score-area {
			flex-direction: column;
		}

		.assessment-card {
			left: 0;
		}

		.ai-card {
			right: 0;
		}

		.section-heading h2,
		.ai-text h2 {
			font-size: 30px;
		}

		.features-section,
		.roles-section {
			padding: 65px 6%;
		}

		.ai-section {
			padding: 65px 20px;
			gap: 40px;
		}

		footer {
			flex-direction: column;
			align-items: flex-start;
			gap: 15px;
		}
	}
</style>