
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card';
import { Loader2, ArrowRight } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await register(name, email, password);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl" />

            <div className="w-full max-w-md p-4 relative z-10">
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-bl from-indigo-500 to-emerald-500 text-white shadow-lg shadow-indigo-500/25 mb-4">
                        <span className="font-bold text-xl">S</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Create Account</h1>
                    <p className="text-gray-400 text-sm">Join SplitMint to manage expenses together</p>
                </div>

                <div className="glass-card rounded-2xl p-1 border border-white/10">
                    <div className="bg-gray-950/50 rounded-xl p-6 sm:p-8 backdrop-blur-sm">
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Full Name</label>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:ring-indigo-500/50 focus:border-indigo-500/50 h-11"
                                    placeholder="John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Email</label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:ring-indigo-500/50 focus:border-indigo-500/50 h-11"
                                    placeholder="you@example.com"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-1">Password</label>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-gray-900/50 border-gray-800 text-white placeholder:text-gray-600 focus:ring-indigo-500/50 focus:border-indigo-500/50 h-11"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium h-11 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <>Get Started <ArrowRight className="ml-2 h-4 w-4 opacity-70" /></>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-500">
                                Already have an account?{' '}
                                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline decoration-emerald-400/30 transition-colors">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
