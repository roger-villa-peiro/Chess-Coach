import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { KeyRound, Mail, AlertCircle, Loader2, Play } from 'lucide-react';

export function Auth({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: email.split('@')[0] }
                    }
                });
                if (error) throw error;
            }
            onLogin();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-zinc-100 flex items-center justify-center gap-3">
                        Chess<span className="text-amber-500">Tactics</span>
                    </h1>
                    <p className="text-zinc-500 mt-2">Grandmaster Training Protocol</p>
                </div>

                {/* Auth Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-xl">
                    <h2 className="text-2xl font-bold text-zinc-100 mb-6">
                        {isLogin ? 'Welcome Back' : 'Join the Academy'}
                    </h2>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 w-5 h-5 text-zinc-500" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    placeholder="magnus@chess.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-zinc-400 mb-1.5 block">Password</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-2.5 w-5 h-5 text-zinc-500" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-4 py-2 text-zinc-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                                    placeholder="••••••••"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-400">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    {isLogin ? 'Login' : 'Sign Up'}
                                    <Play className="w-4 h-4 fill-current group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-zinc-800"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-zinc-900 text-zinc-500">Or</span>
                        </div>
                    </div>

                    <button
                        onClick={onGuest}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-zinc-700 cursor-pointer"
                    >
                        Explore as Guest (No Setup Needed)
                    </button>

                    <div className="mt-6 text-center">

                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="text-sm text-zinc-500 hover:text-amber-500 transition-colors"
                        >
                            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Login'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
