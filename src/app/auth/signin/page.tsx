"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/trpc/react";

function SignInContent() {
	const [isSignUp, setIsSignUp] = useState(false);
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();
	const searchParams = useSearchParams();
	const registerMutation = api.user.register.useMutation();

	useEffect(() => {
		const sp = searchParams;
		if (!sp) return;
		const mode = sp.get("mode");
		const signup = sp.get("signup");
		if (mode === "signup" || signup === "1" || signup === "true") {
			setIsSignUp(true);
		}
	}, [searchParams]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			if (isSignUp) {
				await registerMutation.mutateAsync({ name, email, password });
				// Registration successful, now sign in
				const result = await signIn("credentials", { 
					email, 
					password, 
					redirect: false 
				});
				if (result?.ok) {
					router.push("/data");
				} else {
					setError("Registration successful but login failed. Please try signing in.");
				}
			} else {
				const result = await signIn("credentials", { 
					email, 
					password, 
					redirect: false 
				});
				if (result?.ok) {
					router.push("/data");
				} else {
					setError("Invalid email or password");
				}
			}
		} catch (err: unknown) {
			const message = (err as { message?: string })?.message ?? "Something went wrong. Please try again.";
			setError(message);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center px-4">
			<div className="max-w-md w-full space-y-8">
				{/* Header */}
				<div className="text-center">
					<Link href="/" className="text-4xl font-bold transition-colors group inline-block mb-2">
						<span className="inline-block transition-colors duration-500 ease-in-out text-white group-hover:text-red-500">Trail</span>{" "}
						<span className="inline-block transition-colors duration-500 ease-in-out text-red-500 group-hover:text-white">Break</span>
					</Link>
					<p className="text-slate-400 text-sm">Sim-Racing Telemetry Analysis</p>
					<h2 className="mt-6 text-3xl font-bold text-white">
						{isSignUp ? "Create your account" : "Sign in to your account"}
					</h2>
					<p className="mt-2 text-sm text-slate-400">
						{isSignUp ? "Join the racing community" : "Welcome back to the track"}
					</p>
				</div>

				{/* Form */}
				<div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-8 shadow-2xl">
					<form onSubmit={handleSubmit} className="space-y-6">
						{error && (
							<div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
								<p className="text-red-400 text-sm">{error}</p>
							</div>
						)}

						{isSignUp && (
							<div>
								<label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
									Full Name
								</label>
								<input
									id="name"
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									required={isSignUp}
									className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
									placeholder="Enter your full name"
								/>
							</div>
						)}

						<div>
							<label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
								{isSignUp ? "Email Address" : "Email or Username"}
							</label>
							<input
								id="email"
								type={isSignUp ? "email" : "text"}
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								required
								className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
								placeholder={isSignUp ? "Enter your email" : "Enter email or username"}
							/>
						</div>

						<div>
							<label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
								Password
							</label>
							<input
								id="password"
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								required
								className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
								placeholder="Enter your password"
							/>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 ${
								isLoading
									? "bg-gray-600 cursor-not-allowed"
									: "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
							}`}
						>
							{isLoading ? (
								<div className="flex items-center justify-center">
									<div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
									{isSignUp ? "Creating Account..." : "Signing In..."}
								</div>
							) : (
								isSignUp ? "Create Account" : "Sign In"
							)}
						</button>
					</form>

					{/* Toggle between sign in/up */}
					<div className="mt-6 text-center">
						<p className="text-slate-400">
							{isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
							<button
								onClick={() => {
								setIsSignUp(!isSignUp);
								setError("");
								setName("");
								setEmail("");
								setPassword("");
							}}
							className="text-red-400 hover:text-red-300 font-semibold transition-colors"
						>
							{isSignUp ? "Sign in" : "Sign up"}
						</button>
						</p>
					</div>
				</div>

				{/* Features */}
				<div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-6">
					<h3 className="text-lg font-semibold text-white mb-4">Why Trail Break?</h3>
					<div className="space-y-3">
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span className="text-slate-300 text-sm">Comprehensive telemetry analysis</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span className="text-slate-300 text-sm">Interactive track visualization</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span className="text-slate-300 text-sm">Detailed performance insights</span>
						</div>
						<div className="flex items-center gap-3">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span className="text-slate-300 text-sm">Secure personal data dashboard</span>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="text-center text-slate-500 text-sm">
					<p>&copy; 2025 Trail Break. Built for sim racing enthusiasts.</p>
				</div>
			</div>
		</div>
	);
}

export default function SignInPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center text-white">
					<div className="text-center">
						<div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
						<p className="text-xl">Loading...</p>
					</div>
				</div>
			}
		>
			<SignInContent />
		</Suspense>
	);
} 