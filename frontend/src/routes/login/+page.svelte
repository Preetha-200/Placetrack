<script lang="ts">
	import { page } from '$app/state';
	import { markSessionActive, clearClientSession } from '$lib/client/session';

	const role = page.url.searchParams.get('role') || 'student';
	const isExited = page.url.searchParams.get('exited') === 'true';
	const isExpired = page.url.searchParams.get('expired') === 'true';

	const roleDetails = {
		student: {
			title: 'MCA Student Login',
			subtitle: 'Master of Computer Applications • Placement Readiness',
			label: 'MCA Student Portal',
			initials: 'MCA',
			defaultEmail: 'student@placetrack.ai',
			defaultUsername: '2024MCA1042'
		},
		trainer: {
			title: 'MCA Trainer Login',
			subtitle: 'Department of Computer Applications • Technical Training Hub',
			label: 'MCA Trainer Portal',
			initials: 'TR',
			defaultEmail: 'trainer@placetrack.ai',
			defaultUsername: 'trainer'
		},
		coordinator: {
			title: 'MCA Coordinator Login',
			subtitle: 'Department of Computer Applications • Placement Management Cell',
			label: 'MCA Coordinator Portal',
			initials: 'PC',
			defaultEmail: 'coordinator@placetrack.ai',
			defaultUsername: 'coordinator'
		}
	};

	const currentRole =
		roleDetails[role as keyof typeof roleDetails] || roleDetails.student;

	// Require explicit credentials on each new session after exiting
	let username = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let rememberMe = $state(false);
	let errorMessage = $state('');
	let isLoading = $state(false);

	// Ensure any old in-tab state is cleared when login page is rendered
	$effect(() => {
		clearClientSession();
	});

	async function handleLogin() {
		errorMessage = '';

		if (!username.trim() || !password) {
			errorMessage = role === 'student'
				? 'Please enter your Register Number (or email) and password.'
				: 'Please enter both your username/email and password.';
			return;
		}

		isLoading = true;

		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: username.trim(),
					email: username.trim(),
					identifier: username.trim(),
					registerNumber: username.trim(),
					password,
					rememberMe,
					role
				})
			});

			const data = await res.json();

			if (!res.ok) {
				errorMessage = data.error || 'Authentication failed. Please check your credentials.';
				return;
			}

			// Mark this tab session as active and navigate to dashboard
			if (data.user?.role) {
				markSessionActive(data.user.role);
			}

			window.location.href = data.redirectTo || '/';
		} catch {
			errorMessage = 'Network or server error occurred. Please try again.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{currentRole.title} | Placement Tracker</title>
</svelte:head>

<div class="login-page">
	<section class="left-panel">
		<a href="/" class="brand">
			<div class="brand-icon">P</div>

			<div>
				<h1>Placement Tracker</h1>
				<p>A Web Based Student Trainer Interaction Platform</p>
			</div>
		</a>

		<div class="welcome-content">
			<div class="small-label">PLACEMENT PERFORMANCE PLATFORM</div>

			<h2>
				Prepare today.
				<span>Perform confidently tomorrow.</span>
			</h2>

			<p>
				Track your learning, assessments, and placement preparation from one
				intelligent platform.
			</p>

			<div class="benefits">
				<div class="benefit">
					<div class="check">✓</div>
					<div>
						<strong>Track Your Progress</strong>
						<span>Monitor your technical, aptitude, and verbal performance.</span>
					</div>
				</div>

				<div class="benefit">
					<div class="check">✓</div>
					<div>
						<strong>Learn and Practice</strong>
						<span>Access learning materials and placement assessments.</span>
					</div>
				</div>

				<div class="benefit">
					<div class="check">✓</div>
					<div>
						<strong>Get AI Insights</strong>
						<span>Identify strengths and areas that need improvement.</span>
					</div>
				</div>
			</div>
		</div>

		<div class="left-footer">
			AI-Based Placement Performance Management and Learning Portal
		</div>
	</section>

	<section class="right-panel">
		<div class="login-box">
			<a href="/" class="back-link">← Back to Home</a>

			<div class="role-icon">{currentRole.initials}</div>

			<div class="login-heading">
				<span>{currentRole.label}</span>
				<h2>{currentRole.title}</h2>
				<p>{currentRole.subtitle}</p>
			</div>

			{#if isExited}
				<div class="status-banner success-banner">
					<span class="status-icon">✓</span>
					<div>
						<strong>Logged Out Successfully</strong>
						<p>You have exited the portal. Please enter your credentials to log in again.</p>
					</div>
				</div>
			{:else if isExpired}
				<div class="status-banner info-banner">
					<span class="status-icon">ℹ</span>
					<div>
						<strong>Session Closed</strong>
						<p>Your session ended when you exited or closed the page. Please enter your credentials to log in again.</p>
					</div>
				</div>
			{/if}

			<form onsubmit={(event) => {
				event.preventDefault();
				handleLogin();
			}}>
				<div class="form-group">
					<div class="label-row">
						<label for="username">
							{role === 'student' ? 'Register Number' : 'Username or Email Address'}
						</label>
						{#if role === 'student'}
							<span class="input-subtag">e.g. 2024MCA1042</span>
						{/if}
					</div>

					<div class="input-box">
						<span class="input-icon">{role === 'student' ? '🎓' : '👤'}</span>

						<input
							id="username"
							type="text"
							bind:value={username}
							placeholder={role === 'student'
								? 'Enter Register Number (e.g. 2024MCA1042)'
								: `Enter username or email (e.g. ${currentRole.defaultUsername || 'user'})`}
							autocomplete="username"
						/>
					</div>
				</div>

				<div class="form-group">
					<div class="password-label">
						<label for="password">Password</label>
						<a href="/forgot-password">Forgot Password?</a>
					</div>

					<div class="input-box">
						<span class="input-icon">🔒</span>

						<input
							id="password"
							type={showPassword ? 'text' : 'password'}
							bind:value={password}
							placeholder="Enter your password"
						/>

						<button
							type="button"
							class="show-password"
							onclick={() => (showPassword = !showPassword)}
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</div>
				</div>

				<div class="form-options">
					<label class="remember">
						<input type="checkbox" bind:checked={rememberMe} />
						<span>Remember me</span>
					</label>
				</div>

				{#if errorMessage}
					<div class="error-message">
						{errorMessage}
					</div>
				{/if}

				<button type="submit" class="login-button" disabled={isLoading}>
					{isLoading ? 'Verifying Credentials...' : 'Login to Portal'}
					<span>→</span>
				</button>
			</form>

			<div class="divider">
				<span></span>
				<p>OR</p>
				<span></span>
			</div>

			<a href="/" class="change-role">
				<span>↻</span>
				Choose a different portal
			</a>
		</div>
	</section>
</div>

<style>
	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		font-family: 'Plus Jakarta Sans', Inter, Arial, Helvetica, sans-serif;
		background: var(--bg-page, #f3f9fd);
		color: var(--navy-dark, #06172e);
	}

	:global(a) {
		text-decoration: none;
	}

	.login-page {
		min-height: 100vh;
		display: grid;
		grid-template-columns: 1fr 1fr;
	}

	/* LEFT SIDE */

	.left-panel {
		min-height: 100vh;
		background: radial-gradient(circle at 85% 15%, #0f4c81 0%, transparent 45%),
			radial-gradient(circle at 10% 85%, #0a335c 0%, transparent 40%),
			linear-gradient(145deg, #041226 0%, #061e38 50%, #08284d 100%);
		padding: 48px;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		color: white;
		position: relative;
		overflow: hidden;
	}

	.left-panel::after {
		content: '';
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px);
		background-size: 28px 28px;
		pointer-events: none;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 12px;
		position: relative;
		z-index: 1;
	}

	.brand-icon {
		width: 44px;
		height: 44px;
		background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%);
		color: #06172e;
		display: grid;
		place-items: center;
		font-weight: 800;
		font-size: 20px;
		border-radius: 12px;
		box-shadow: 0 8px 18px rgba(2, 132, 199, 0.35);
	}

	.brand h1 {
		font-size: 22px;
		margin: 0;
		color: white;
		font-weight: 800;
		letter-spacing: -0.4px;
	}

	.brand p {
		margin: 0;
		color: #93c5fd;
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.8px;
		text-transform: uppercase;
	}

	.welcome-content {
		max-width: 480px;
		position: relative;
		z-index: 1;
	}

	.small-label {
		color: #38bdf8;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 1.5px;
		margin-bottom: 14px;
	}

	.welcome-content h2 {
		font-size: 38px;
		line-height: 1.15;
		margin: 0 0 16px;
		color: white;
		font-weight: 800;
		letter-spacing: -1px;
	}

	.welcome-content h2 span {
		color: #7dd3fc;
		display: block;
	}

	.welcome-content p {
		color: #cbd5e1;
		font-size: 15px;
		line-height: 1.6;
		margin: 0 0 32px;
	}

	.benefits {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.benefit {
		display: flex;
		align-items: flex-start;
		gap: 12px;
	}

	.benefit .check {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(56, 189, 248, 0.15);
		border: 1px solid rgba(56, 189, 248, 0.3);
		color: #38bdf8;
		display: grid;
		place-items: center;
		font-size: 12px;
		font-weight: 800;
		flex-shrink: 0;
	}

	.benefit strong {
		display: block;
		font-size: 13.5px;
		color: white;
		margin-bottom: 2px;
	}

	.benefit span {
		color: #94a3b8;
		font-size: 12.5px;
		line-height: 1.4;
	}

	.left-footer {
		color: #64748b;
		font-size: 12px;
		position: relative;
		z-index: 1;
	}

	/* RIGHT SIDE */

	.right-panel {
		background: #f8fafc;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 48px;
		min-height: 100vh;
	}

	.login-box {
		width: 100%;
		max-width: 440px;
	}

	.back-link {
		display: inline-block;
		margin-bottom: 24px;
		color: var(--text-muted, #486b88);
		font-size: 12px;
		font-weight: 600;
		transition: color 0.2s ease;
	}

	.back-link:hover {
		color: var(--blue-primary, #0f4c81);
	}

	.role-icon {
		width: 58px;
		height: 58px;
		display: grid;
		place-items: center;
		margin-bottom: 16px;
		border-radius: 16px;
		background: var(--ice-tint, #e6f4fc);
		color: var(--blue-primary, #0f4c81);
		font-size: 15px;
		font-weight: 800;
		border: 1px solid var(--border-subtle, #cce7f7);
	}

	.login-heading > span {
		color: var(--blue-primary, #0f4c81);
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 1.3px;
	}

	.login-heading h2 {
		margin: 8px 0;
		font-size: 32px;
		letter-spacing: -0.8px;
		color: var(--navy-dark, #06172e);
		font-weight: 800;
	}

	.login-heading p {
		margin: 0 0 20px;
		color: var(--text-muted, #486b88);
		font-size: 13.5px;
	}

	.form-group {
		margin-bottom: 18px;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: 7px;
	}

	label {
		display: block;
		font-size: 12.5px;
		font-weight: 700;
		color: var(--navy-dark, #06172e);
	}

	.input-subtag {
		font-size: 10.5px;
		color: #0284c7;
		font-weight: 600;
	}

	.password-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 7px;
	}

	.password-label a {
		color: var(--blue-primary, #0f4c81);
		font-size: 11.5px;
		font-weight: 700;
		transition: color 0.2s ease;
	}

	.password-label a:hover {
		color: var(--navy-dark, #06172e);
	}

	.input-box {
		height: 48px;
		display: flex;
		align-items: center;
		border: 1.5px solid var(--border-subtle, #cce7f7);
		border-radius: 11px;
		background: white;
		transition: all 0.2s ease;
	}

	.input-box:focus-within {
		border-color: var(--blue-primary, #0f4c81);
		box-shadow: 0 0 0 3.5px rgba(15, 76, 129, 0.14);
	}

	.input-icon {
		width: 44px;
		text-align: center;
		color: var(--text-muted, #486b88);
		font-size: 14px;
	}

	.input-box input {
		width: 100%;
		height: 100%;
		border: 0;
		outline: 0;
		background: transparent;
		font-size: 13px;
		color: var(--navy-dark, #06172e);
		font-family: inherit;
	}

	.show-password {
		border: 0;
		background: transparent;
		padding: 0 16px;
		color: var(--blue-primary, #0f4c81);
		font-size: 11px;
		font-weight: 700;
		cursor: pointer;
	}

	.form-options {
		display: flex;
		justify-content: space-between;
		margin-bottom: 18px;
	}

	.remember {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-muted, #486b88);
		cursor: pointer;
	}

	.remember input {
		accent-color: var(--blue-primary, #0f4c81);
		width: 15px;
		height: 15px;
	}

	.status-banner {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 14px;
		border-radius: 11px;
		margin-bottom: 18px;
		font-size: 12px;
		line-height: 1.4;
	}

	.status-icon {
		font-size: 15px;
		line-height: 1;
		flex-shrink: 0;
		margin-top: 2px;
	}

	.status-banner strong {
		display: block;
		margin-bottom: 2px;
		font-size: 12.5px;
	}

	.status-banner p {
		margin: 0;
	}

	.success-banner {
		background: #edfdf2;
		border: 1px solid #b7f0c5;
		color: #166534;
	}

	.info-banner {
		background: #f0f7fc;
		border: 1px solid #cce7f7;
		color: #0c4a6e;
	}

	.error-message {
		background: #fef2f2;
		color: #b91c1c;
		border: 1px solid #fecaca;
		padding: 10px 14px;
		border-radius: 10px;
		font-size: 12px;
		font-weight: 600;
		margin-bottom: 16px;
	}

	.login-button {
		width: 100%;
		height: 48px;
		background: linear-gradient(135deg, var(--blue-primary, #0f4c81) 0%, #0a335c 100%);
		color: white;
		border: 0;
		border-radius: 11px;
		font-size: 13.5px;
		font-weight: 700;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: 0 4px 14px rgba(15, 76, 129, 0.25);
	}

	.login-button:hover:not(:disabled) {
		transform: translateY(-1px);
		box-shadow: 0 6px 18px rgba(15, 76, 129, 0.35);
	}

	.login-button:disabled {
		opacity: 0.65;
		cursor: not-allowed;
	}

	.login-button span {
		font-size: 15px;
		transition: transform 0.2s ease;
	}

	.login-button:hover span {
		transform: translateX(3px);
	}

	.divider {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 20px 0;
	}

	.divider span {
		height: 1px;
		flex: 1;
		background: var(--border-subtle, #cce7f7);
	}

	.divider p {
		margin: 0;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-muted, #486b88);
		letter-spacing: 0.5px;
	}

	.change-role {
		width: 100%;
		height: 44px;
		border: 1.5px solid var(--border-subtle, #cce7f7);
		border-radius: 11px;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		color: var(--text-body, #0b2545);
		font-size: 12px;
		font-weight: 700;
		background: white;
		transition: all 0.2s ease;
	}

	.change-role:hover {
		border-color: var(--blue-primary, #0f4c81);
		color: var(--blue-primary, #0f4c81);
		background: var(--ice-tint, #e6f4fc);
	}

	@media (max-width: 850px) {
		.login-page {
			grid-template-columns: 1fr;
		}

		.left-panel {
			display: none;
		}

		.right-panel {
			padding: 30px 20px;
		}
	}

	@media (max-width: 450px) {
		.right-panel {
			padding: 25px 17px;
		}

		.login-heading h2 {
			font-size: 27px;
		}
	}
</style>