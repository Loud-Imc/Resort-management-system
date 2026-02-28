import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/routeguide.svg';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const { login, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: 'admin@resort.com',
            password: 'admin123',
        },
    });

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const onSubmit = async (data: LoginFormData) => {
        try {
            setError(null);
            await login(data);
            navigate('/');
        } catch (err: any) {
            setError('Invalid email or password');
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card rounded-xl shadow-xl border border-border p-8 transition-colors duration-300">
                <div className="text-center mb-10 flex flex-col items-center">
                    <img src={logo} alt="Route Guide" className="h-24 w-auto mb-4" />
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Route Guide</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Platform Administration</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 mb-8 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                            Email address
                        </label>
                        <input
                            {...register('email')}
                            type="email"
                            className="w-full px-4 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                            placeholder="admin@example.com"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                            Security password
                        </label>
                        <div className="relative">
                            <input
                                {...register('password')}
                                type={showPassword ? "text" : "password"}
                                className="w-full px-4 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="text-destructive text-xs mt-2 font-medium">{errors.password.message}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-card disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-bold text-lg transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                        ) : (
                            'Sign in to platform'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
