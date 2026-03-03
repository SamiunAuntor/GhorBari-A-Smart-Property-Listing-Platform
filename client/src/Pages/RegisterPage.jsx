import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Upload, CheckCircle2 } from "lucide-react";
import { useNavigate, Link } from "react-router";
import Loading from "../Components/Loading";

import registerImg from "../assets/registerImage.jpg";
import { uploadImageToImgBB } from "../Utilities/UploadImage";
import { showToast } from "../Utilities/ToastMessage";
import useAuth from "../Hooks/useAuth";
import useAxios from "../Hooks/useAxios";

const RegisterPage = () => {
    const { registerUserWithEmailPassword, updateUserProfile, loginWithGoogle } = useAuth();
    const navigate = useNavigate();
    const axios = useAxios();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState("");
    const [initialLoading, setInitialLoading] = useState(true);


    const { register, handleSubmit, watch, formState: { errors } } = useForm();
    const password = watch("password");

    // Email Password Registration
    const onSubmit = async (data) => {
        try {
            setLoading(true);

            // 1️⃣ Firebase email/password registration
            const userCredential = await registerUserWithEmailPassword(data.email, data.password);
            const user = userCredential.user;

            // Upload avatar to ImgBB
            let imageUrl = "";
            if (data.avatar && data.avatar.length > 0) {
                imageUrl = await uploadImageToImgBB(data.avatar[0]);
            }

            // Update Firebase profile
            await updateUserProfile({
                displayName: data.fullName,
                photoURL: imageUrl,
            });

            // Update backend DB (store URL only)
            const { data: existingUser } = await axios.get(`/check-user-exist?email=${data.email}`);
            if (!existingUser.exists) {
                await axios.post("/register-user", {
                    email: data.email,
                    name: data.fullName,
                    profileImage: imageUrl || "",
                    phone: data.phone ? `+88${data.phone}` : "",
                    role: "user",
                });
            }

            navigate("/");
            showToast(`Welcome, ${data.fullName}! 🎉`, "success");

        } catch (error) {
            showToast(error.response?.data?.message || error.message || "Registration failed", "error");
        } finally {
            setLoading(false);
        }
    };



    // Google Sign-In
    const handleGoogleSignIn = async () => {
        try {
            setLoading(true);

            // Firebase Google sign in
            const result = await loginWithGoogle();
            const user = result.user;

            // Check if user exists in DB
            const { data } = await axios.get(`/check-user-exist?email=${user.email}`);

            // Create DB entry if not exists
            if (!data.exists) {
                await axios.post("/register-user", {
                    email: user.email,
                    name: user.displayName || "User",
                    profileImage: user.photoURL || "",
                    phone: "",
                    role: "user",
                });
            } else {
                // User exists: sync Firebase photoURL with database profileImage
                const token = await user.getIdToken();
                const { data: userProfile } = await axios.get(`/user-profile`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                // Update Firebase photoURL if database has profileImage
                if (userProfile?.profileImage && userProfile.profileImage !== user.photoURL) {
                    await updateUserProfile({
                        photoURL: userProfile.profileImage
                    });
                } else if (!userProfile?.profileImage && user.photoURL) {
                    // Update database if it's missing profileImage but Firebase has it
                    await axios.patch('/update-profile', {
                        profileImage: user.photoURL
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }
            }

            navigate("/");
            showToast(`Welcome, ${user.displayName || "User"}! 🚀`, "success");

        } catch (error) {
            showToast(
                error.response?.data?.message || error.message || "Google sign-in failed",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };



    // LAND AT TOP & FORCED INITIAL LOADING (0.25s)
    useEffect(() => {
        window.scrollTo(0, 0);
        const timer = setTimeout(() => {
            setInitialLoading(false);
        }, 250);
        return () => clearTimeout(timer);
    }, []);

    if (initialLoading) {
        return <Loading />;
    }






    return (
        <div className="min-h-screen flex bg-white">
            {/* LEFT – FORM (30% on Desktop, 100% on Tablet/Mobile) */}
            <div className="w-full lg:w-[30%] flex items-center justify-center bg-gray-50 px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-md lg:max-w-sm">
                    {/* HEADER */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h2>
                        <p className="text-gray-500 mt-2 font-light">Join the premium community of GhorBari</p>
                    </div>

                    {/* FORM */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        {/* FULL NAME */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Full Name <span className="text-orange-500">*</span></label>
                            <input
                                type="text"
                                placeholder="e.g. John Doe"
                                {...register("fullName", { required: "Full name is required" })}
                                className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-gray-800 focus:border-orange-500 outline-none transition-all"
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1 ml-1">{errors.fullName.message}</p>}
                        </div>


                        {/* EMAIL */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Email Address <span className="text-orange-500">*</span></label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                {...register("email", { required: "Email is required" })}
                                className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 text-gray-800 focus:border-orange-500 outline-none transition-all"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email.message}</p>}
                        </div>

                        {/* PHONE NUMBER */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                                Phone Number <span className="text-orange-500">*</span>
                            </label>
                            <div className="flex items-center bg-white border border-gray-200 rounded-md focus-within:border-orange-500 transition-all">
                                <span className="px-4 py-2.5 text-gray-700 font-medium select-none">+88</span>
                                <input
                                    type="tel"
                                    placeholder="01XXXXXXXXX"
                                    maxLength="11"
                                    {...register("phone", {
                                        required: "Phone number is required",
                                        pattern: {
                                            value: /^\d{11}$/,
                                            message: "Phone number must be exactly 11 digits"
                                        }
                                    })}
                                    onInput={(e) => {
                                        // Only allow digits
                                        e.target.value = e.target.value.replace(/\D/g, '');
                                    }}
                                    className="flex-1 bg-transparent py-2.5 pr-4 text-gray-800 focus:outline-none"
                                />
                            </div>
                            {errors.phone && <p className="text-red-500 text-xs mt-1 ml-1">{errors.phone.message}</p>}
                        </div>

                        {/* PASSWORD */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Password <span className="text-orange-500">*</span></label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...register("password", {
                                        required: "Password is required",
                                        minLength: { value: 6, message: "Min 6 characters" },
                                        validate: {
                                            hasUpper: (v) => /[A-Z]/.test(v) || "Must include a capital letter",
                                            hasLower: (v) => /[a-z]/.test(v) || "Must include a small letter"
                                        }
                                    })}
                                    className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 pr-12 text-gray-800 focus:border-orange-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors flex items-center justify-center"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password.message}</p>}
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Confirm Password <span className="text-orange-500">*</span></label>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    {...register("confirmPassword", {
                                        required: "Confirm your password",
                                        validate: (value) => value === password || "Passwords do not match",
                                    })}
                                    className="w-full bg-white border border-gray-200 rounded-md px-4 py-2.5 pr-12 text-gray-800 focus:border-orange-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors flex items-center justify-center"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 ml-1">{errors.confirmPassword.message}</p>}
                        </div>

                        {/* AVATAR UPLOAD */}
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Profile Picture <span className="text-orange-500">*</span></label>
                            <label className={`flex items-center gap-3 border-2 border-dashed rounded-md px-4 py-2.5 cursor-pointer transition-all ${fileName ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:border-orange-300'}`}>
                                {fileName ? <CheckCircle2 className="text-green-500" size={18} /> : <Upload className="text-gray-400" size={18} />}
                                <span className={`text-sm truncate ${fileName ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                                    {fileName || "Choose avatar image"}
                                </span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    {...register("avatar", {
                                        required: "Avatar is required",
                                        onChange: (e) => setFileName(e.target.files[0]?.name || "")
                                    })}
                                />
                            </label>
                            {errors.avatar && <p className="text-red-500 text-xs mt-1 ml-1">{errors.avatar.message}</p>}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 rounded-md font-bold shadow-lg shadow-orange-200 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-70 mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Registering...
                                </span>
                            ) : "Create Account"}
                        </button>
                    </form>

                    {/* DIVIDER */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs font-medium text-gray-400">OR</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* GOOGLE BUTTON */}
                    <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full border border-gray-200 bg-white flex items-center justify-center gap-3 py-2.5 rounded-md font-semibold text-gray-700 hover:bg-gray-50 transition-all mb-4"
                    >
                        <img
                            src="https://www.svgrepo.com/show/475656/google-color.svg"
                            alt="Google"
                            className="w-5 h-5"
                        />
                        Continue with Google
                    </button>

                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{" "}
                        <Link to="/login" className="text-orange-500 font-bold hover:underline">
                            Login
                        </Link>
                    </p>
                </div>
            </div>

            {/* RIGHT – IMAGE (Visible ONLY on LG/Desktop) */}
            <div className="hidden lg:block lg:w-[70%] relative">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-50/20 to-transparent z-10" />
                <img
                    src={registerImg}
                    alt="Register"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
};

export default RegisterPage;
