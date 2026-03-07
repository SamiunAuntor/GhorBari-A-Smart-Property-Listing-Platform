import { createBrowserRouter, Navigate } from "react-router";
import Error404Page from "./Pages/error404Page";
import HomeLayout from "./Layouts/HomeLayout";
import BuyOrRentPage from "./Pages/BuyOrRentPage/BuyOrRentPage";
import ListPropertyPage from "./Pages/ListPropertyPage/ListPropertyPage"
import HomePage from "./Pages/HomePage";
import RegisterPage from "./Pages/RegisterPage";
import LoginPage from "./Pages/LoginPage";
import ResetPasswordPage from "./Pages/ResetPasswordPage";
import AddProperty from "./Pages/ListPropertyPage/AddProperty";
import PropertyDetails from "./Pages/PropertyDetails/PropertyDetails";
import ProfilePage from "./Pages/ProfilePage/ProfilePage";
import PrivateRoute from "./PrivateRoute/PrivateRoute";
import PublicUserProfile from "./Pages/ProfilePage/PublicUserProfile";
import DashboardLayout from "./Layouts/DashboardLayout";
import AdminDashboardHome from "./Pages/AdminDashboard/AdminDashboardHome";
import AdminRoute from "./PrivateRoute/AdminRoute";
import PendingUserVerifications from "./Pages/AdminDashboard/PendingUserVerifications";
import AllUsers from "./Pages/AdminDashboard/AllUsers";
import AllPropertyListings from "./Pages/AdminDashboard/AllPropertyListings";
import ChatPage from "./Pages/ChatPage/ChatPage";
import ComparisonPage from "./Pages/ComparisonPage/ComparisonPage";
import WishlistPage from "./Pages/WishlistPage/WishlistPage";
import AboutPage from "./Pages/AboutPage";
import PrivacyPolicyPage from "./Pages/PrivacyPolicyPage";
import TrustSafetyPage from "./Pages/TrustSafetyPage";


const router = createBrowserRouter([
    {
        path: "/",
        element: <HomeLayout></HomeLayout>,
        children: [
            {
                index: true,
                element: <HomePage></HomePage>,
            },
            {
                path: "/register",
                element: <RegisterPage></RegisterPage>
            },
            {
                path: "/login",
                element: <LoginPage></LoginPage>
            },
            {
                path: "/reset-password",
                element: <ResetPasswordPage></ResetPasswordPage>
            },
            {
                path: "/properties",
                element: <PrivateRoute><BuyOrRentPage></BuyOrRentPage></PrivateRoute>
            },
            {
                path: "/property-details/:id",
                element: <PrivateRoute><PropertyDetails></PropertyDetails></PrivateRoute>
            },
            {
                path: "/list-property",
                element: <PrivateRoute><ListPropertyPage></ListPropertyPage></PrivateRoute>
            },
            {
                path: "/add-property",
                element: <PrivateRoute><AddProperty></AddProperty></PrivateRoute>
            },

            {
                path: "/profile",
                element: <PrivateRoute><ProfilePage></ProfilePage></PrivateRoute>
            },
            {
                path: "/owner-profile/:email",
                element: <PrivateRoute><PublicUserProfile></PublicUserProfile></PrivateRoute>
            },
            {
                path: "/chat",
                element: <PrivateRoute><ChatPage></ChatPage></PrivateRoute>
            },
            {
                path: "/compare",
                element: <PrivateRoute><ComparisonPage></ComparisonPage></PrivateRoute>
            },
            {
                path: "/wishlist",
                element: <PrivateRoute><WishlistPage /></PrivateRoute>
            },
            {
                path: "/about",
                element: <AboutPage />
            },
            {
                path: "/privacy-policy",
                element: <PrivacyPolicyPage />
            },
            {
                path: "/trust-safety",
                element: <TrustSafetyPage />
            }
        ]
    },
    {
        path: "/admin-dashboard",
        element: <AdminRoute><DashboardLayout /></AdminRoute>,
        children: [
            {
                index: true,
                element: <AdminDashboardHome></AdminDashboardHome>
            },
            {
                path: "pending-verifications",
                element: <AdminRoute><PendingUserVerifications></PendingUserVerifications></AdminRoute>
            },
            {
                path: "all-users",
                element: <AdminRoute><AllUsers></AllUsers></AdminRoute>
            },
            {
                path: "all-properties",
                element: <AdminRoute><AllPropertyListings></AllPropertyListings></AdminRoute>
            },
            {
                path: "property-details/:id",
                element: <AdminRoute><PropertyDetails isAdminPreview={true} /></AdminRoute>
            },
        ]
    },
    {
        path: "*",
        element: <Error404Page></Error404Page>,
    }
])

export default router;
