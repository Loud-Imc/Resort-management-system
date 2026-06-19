import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import logo from '../assets/routeguide.svg';

const loginSchema = z.object({
    email: z.string().min(1, 'Email or Phone Number is required'),
    password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

type ErrorField = 'email' | 'password' | 'general' | null;

function parseLoginError(err: any): { message: string; field: ErrorField } {
    const raw: string =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';

    const msg = Array.isArray(raw) ? raw[0] : raw;
    const lower = msg.toLowerCase();

    if (lower.includes('inactive')) {
        return { message: 'Your account has been deactivated. Please contact support.', field: 'general' };
    }
    if (lower.includes('not found') || lower.includes('no account')) {
        return { message: 'No account found with that email or phone number.', field: 'email' };
    }
    if (lower.includes('invalid credentials') || lower.includes('password')) {
        return { message: 'Incorrect password. Please try again.', field: 'password' };
    }
    if (lower.includes('otp')) {
        return { message: 'This account uses OTP login. Password login is not available.', field: 'general' };
    }
    if (lower.includes('not registered') || lower.includes('access denied') || lower.includes('administrator')) {
        return { message: 'This account does not have administrator access.', field: 'general' };
    }
    return { message: msg, field: 'general' };
}

export default function Login() {
    const [error, setError] = useState<string | null>(null);
    const [errorField, setErrorField] = useState<ErrorField>(null);
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
            setErrorField(null);
            await login(data);
            navigate('/');
        } catch (err: any) {
            const { message, field } = parseLoginError(err);
            setError(message);
            setErrorField(field);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card rounded-xl shadow-xl border border-border p-8 transition-colors duration-300">
                <div className="text-center mb-10 flex flex-col items-center">
                    <img src={logo} alt="Route Guide" className="h-20 w-auto mb-4" />
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">Route Guide</h1>
                    <p className="text-muted-foreground mt-2 font-medium">Platform Administration</p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 mb-8 text-sm font-medium flex items-start gap-3">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                            Email or Phone Number
                        </label>
                        <input
                            {...register('email')}
                            type="text"
                            className={`w-full px-4 py-3 border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
                                errorField === 'email' ? 'border-destructive ring-1 ring-destructive/50' : 'border-border'
                            }`}
                            placeholder="Email or Phone Number"
                            onChange={() => { if (errorField === 'email') { setError(null); setErrorField(null); } }}
                        />
                        {errors.email && (
                            <p className="text-destructive text-xs mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email.message}</p>
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
                                className={`w-full px-4 py-3 border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12 ${
                                    errorField === 'password' ? 'border-destructive ring-1 ring-destructive/50' : 'border-border'
                                }`}
                                placeholder="••••••••"
                                onChange={() => { if (errorField === 'password') { setError(null); setErrorField(null); } }}
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
                            <p className="text-destructive text-xs mt-2 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.password.message}</p>
                        )}
                        {errorField === 'password' && !errors.password && (
                            <p className="text-destructive text-xs mt-2 font-medium flex items-center gap-1"><AlertCircle className="h-3 w-3" />Incorrect password. Please try again.</p>
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
