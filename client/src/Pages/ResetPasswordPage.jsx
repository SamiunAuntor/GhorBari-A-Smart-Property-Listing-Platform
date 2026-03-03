import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate, Link } from "react-router";

import loginImg from "../assets/forgotpasswordimage.png";
import Loading from "../Components/Loading";
import { showToast } from "../Utilities/ToastMessage";
import useAuth from "../Hooks/useAuth";

const ResetPasswordPage = () => {
    const { resetPassword } = useAuth();
    const navigate = useNavigate();

    const [initialLoading, setInitialLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm();

    // LAND AT TOP & FORCED INITIAL LOADING (0.25s)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 250);
        return () => clearTimeout(timer);
    }, []);

    // Send password reset email
    const onSubmit = async (data) => {
        try {
            setActionLoading(true);
            await resetPassword(data.email);
            setEmailSent(true);
            showToast("Password reset email sent! Check your inbox 📧", "success");
        } catch (error) {
            showToast(error.message || "Failed to send reset email", "error");
        } finally {
            setActionLoading(false);
        }
    };

    if (initialLoading) return <Loading />;

    return (
        <div className="min-h-screen flex bg-white">
            {/* LEFT – FORM (30% on Desktop, 100% on Tablet/Mobile) */}
            <div className="w-full lg:w-[30%] flex items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-md lg:max-w-sm">
                    {/* HEADER */}
                    <div className="text-center mb-8">
                        {!emailSent ? (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 rounded-full bg-orange-100">
                                        <Mail className="text-orange-500" size={32} />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reset Password</h2>
                                <p className="text-gray-500 mt-2 font-light">Enter your email to receive a password reset link</p>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center mb-4">
                                    <div className="p-3 rounded-full bg-green-100">
                                        <CheckCircle2 className="text-green-500" size={32} />
                                    </div>
                                </div>
                                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Check Your Email</h2>
                                <p className="text-gray-500 mt-2 font-light">We've sent a password reset link to your email</p>
                            </>
                        )}
                    </div>

                    {!emailSent ? (
                        <>
                            {/* FORM */}
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                {/* EMAIL */}
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Email Address <span className="text-orange-500">*</span></label>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        {...register("email", { 
                                            required: "Email is required",
                                            pattern: {
                                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                                message: "Invalid email address"
                                            }
                                        })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-gray-800 focus:border-orange-500 outline-none transition-all"
                                    />
                                    {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
                                </div>

                                {/* SUBMIT BUTTON */}
                                <button
                                    type="submit"
                                    disabled={actionLoading}
                                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 mt-2"
                                >
                                    {actionLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Sending...
                                        </span>
                                    ) : "Send Reset Link"}
                                </button>
                            </form>

                            {/* BACK TO LOGIN */}
                            <div className="mt-6 text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-orange-500 transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* SUCCESS MESSAGE */}
                            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
                                <p className="text-sm text-gray-600 text-center">
                                    If an account exists with this email, you'll receive a password reset link shortly.
                                    Please check your spam folder if you don't see it in your inbox.
                                </p>
                            </div>

                            {/* ACTION BUTTONS */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setEmailSent(false)}
                                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:brightness-110 active:scale-[0.98] transition-all"
                                >
                                    Resend Email
                                </button>
                                <Link
                                    to="/login"
                                    className="block w-full border border-gray-200 bg-white text-center py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                                >
                                    Back to Login
                                </Link>
                            </div>
                        </>
                    )}

                    <p className="text-center text-sm text-gray-500 mt-6">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-orange-500 font-bold hover:underline">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>

            {/* RIGHT – IMAGE (Visible ONLY on Desktop) */}
            <div className="hidden lg:block lg:w-[70%] relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-transparent z-10" />
                <img
                    src={loginImg}
                    alt="Reset Password"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default ResetPasswordPage;


















