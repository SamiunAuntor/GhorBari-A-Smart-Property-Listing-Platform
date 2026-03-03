import axios from "axios";
import { getAuth, signOut } from "firebase/auth";
import { useEffect } from "react";

const axiosSecure = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000",
});

const useAxiosSecure = () => {
    const auth = getAuth();

    useEffect(() => {
        // Intercept Request to add Authorization Header
        const requestInterceptor = axiosSecure.interceptors.request.use(
            async (config) => {
                const user = auth.currentUser;
                if (user) {
                    const token = await user.getIdToken();
                    config.headers.authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // Intercept Response to handle 401/403 errors
        const responseInterceptor = axiosSecure.interceptors.response.use(
            (response) => response,
            async (error) => {
                const status = error.response ? error.response.status : null;
                if (status === 401 || status === 403) {
                    // Force logout on unauthorized access
                    try {
                        await signOut(auth);
                    } catch (e) {
                        console.error('Error signing out', e);
                    }
                    // Use a safe full-page redirect so this hook doesn't require Router context
                    window.location.href = '/login';
                }
                return Promise.reject(error);
            }
        );

        // Cleanup interceptors on unmount
        return () => {
            axiosSecure.interceptors.request.eject(requestInterceptor);
            axiosSecure.interceptors.response.eject(responseInterceptor);
        };
    }, [auth]);

    return axiosSecure;
};

export default useAxiosSecure;