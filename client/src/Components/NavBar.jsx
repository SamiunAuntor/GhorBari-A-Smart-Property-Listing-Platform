import { useState } from "react";
import { Menu, X, User, Scale } from "lucide-react";
import { Link, NavLink } from "react-router";
import useAuth from "../Hooks/useAuth";
import { showToast } from "../Utilities/ToastMessage";
import { Tooltip } from "react-tooltip";
import 'react-tooltip/dist/react-tooltip.css';
import useAdmin from "../Hooks/useAdmin";
import { useNavigate } from "react-router";

const Navbar = () => {
    const [menuOpen, setMenuOpen] = useState(false);
    const { user, logoutUser } = useAuth();
    const navigate = useNavigate();
    const [isAdmin, isAdminLoading] = useAdmin();


    const handleLogout = async () => {
        try {
            await logoutUser();
            showToast("Successfully logged out 👋", "success");
        } catch (error) {
            console.error(error);
            showToast(error.message || "Logout failed ❌", "error");
        }
    };

    const handleAvatarClick = () => {
        if (isAdminLoading) return; // prevent premature navigation

        if (isAdmin) {
            navigate("/admin-dashboard");
        } else {
            navigate("/profile");
        }
    };



    return (
        <header className="w-full bg-white/70 backdrop-blur-md sticky top-0 z-[9999] border-b border-white/20">
            <nav className="w-11/12 mx-auto h-16 flex items-center justify-between">
                {/* LOGO */}
                <Link
                    to="/"
                    className="text-xl md:text-2xl font-bold text-orange-500 tracking-wide"
                >
                    GhorBari
                </Link>

                {/* NAV LINKS - DESKTOP */}
                <div className="hidden md:flex items-center gap-2">
                    <NavLink
                        to="/"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
              ${isActive
                                ? "bg-orange-500 text-white"
                                : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                            }`
                        }
                    >
                        Home
                    </NavLink>

                    <NavLink
                        to="/properties"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
              ${isActive
                                ? "bg-orange-500 text-white"
                                : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                            }`
                        }
                    >
                        Marketplace
                    </NavLink>

                    <NavLink
                        to="/list-property"
                        className={({ isActive }) =>
                            `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
              ${isActive
                                ? "bg-orange-500 text-white"
                                : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                            }`
                        }
                    >
                        My Properties
                    </NavLink>

                    {/* Only show Messages if logged in */}
                    {user && (
                        <NavLink
                            to="/chat"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
                  ${isActive
                                    ? "bg-orange-500 text-white"
                                    : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                }`
                            }
                        >
                            Chat
                        </NavLink>
                    )}

                    {/* Comparison link if logged in */}
                    {user && (
                        <NavLink
                            to="/compare"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
                  ${isActive
                                    ? "bg-orange-500 text-white"
                                    : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                }`
                            }
                        >
                            Compare
                        </NavLink>
                    )}
                    {user && (
                        <NavLink
                            to="/wishlist"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
                  ${isActive
                                    ? "bg-orange-500 text-white"
                                    : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                }`
                            }
                        >
                            Wishlist
                        </NavLink>
                    )}

                    {/* Only show My Profile if logged in */}
                    {user && (
                        <NavLink
                            to="/profile"
                            className={({ isActive }) =>
                                `px-4 py-2 rounded-md text-sm md:text-base font-medium transition-all duration-200
                  ${isActive
                                    ? "bg-orange-500 text-white"
                                    : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                }`
                            }
                        >
                            My Profile
                        </NavLink>
                    )}

                </div>




                {/* AUTH BUTTONS / USER AVATAR - DESKTOP */}
                <div className="hidden md:flex items-center gap-4">
                    {!user ? (
                        <>
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm md:text-base font-medium border border-orange-400 text-orange-500 rounded-md hover:bg-orange-400/10 transition"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="px-4 py-2 text-sm md:text-base font-medium bg-gradient-to-r from-orange-400 to-yellow-400 text-white rounded-md hover:brightness-110 transition"
                            >
                                Register
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 text-sm md:text-base font-medium border border-orange-400 text-orange-500 rounded-md hover:bg-orange-400/10 transition"
                            >
                                Logout
                            </button>

                            {/* Avatar with tooltip */}
                            <div>
                                <div
                                    onClick={handleAvatarClick}
                                    data-tooltip-id="userTooltip"
                                    data-tooltip-content={
                                        isAdmin ? "Admin Dashboard" : user.displayName || "User"
                                    }
                                    className="w-10 h-10 rounded-full overflow-hidden cursor-pointer border border-gray-200 flex items-center justify-center bg-gray-100 hover:ring-2 hover:ring-orange-400 transition"
                                >

                                    {user.photoURL ? (
                                        <img
                                            src={user.photoURL}
                                            alt={user.displayName || "User Avatar"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <User size={20} className="text-gray-400" />
                                    )}
                                </div>
                                <Tooltip id="userTooltip" place="bottom" effect="solid" />
                            </div>

                        </div>
                    )}
                </div>

                {/* MOBILE MENU BUTTON */}
                <div className="md:hidden flex items-center gap-3">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="p-2 rounded-md hover:bg-gray-100 transition"
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* MOBILE MENU */}
            {
                menuOpen && (
                    <div className="md:hidden bg-white/70 backdrop-blur-md shadow-inner border-t border-white/20">
                        <div className="w-11/12 mx-auto flex flex-col py-3 gap-2">
                            <NavLink
                                to="/"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${isActive
                                        ? "bg-orange-500 text-white"
                                        : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                    }`
                                }
                            >
                                Home
                            </NavLink>

                            <NavLink
                                to="/properties"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${isActive
                                        ? "bg-orange-500 text-white"
                                        : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                    }`
                                }
                            >
                                Marketplace
                            </NavLink>

                            <NavLink
                                to="/list-property"
                                onClick={() => setMenuOpen(false)}
                                className={({ isActive }) =>
                                    `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                ${isActive
                                        ? "bg-orange-500 text-white"
                                        : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                    }`
                                }
                            >
                                My Properties
                            </NavLink>

                            {user && (
                                <NavLink
                                    to="/chat"
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${isActive
                                            ? "bg-orange-500 text-white"
                                            : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                        }`
                                    }
                                >
                                    Chat
                                </NavLink>
                            )}

                            {user && (
                                <NavLink
                                    to="/compare"
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1
                    ${isActive
                                            ? "bg-orange-500 text-white"
                                            : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                        }`
                                    }
                                >
                                    Compare
                                </NavLink>
                            )}                            {user && (
                                <NavLink
                                    to="/wishlist"
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
                    ${isActive
                                            ? "bg-orange-500 text-white"
                                            : "text-gray-700 hover:bg-orange-400/20 hover:text-orange-600"
                                        }`
                                    }
                                >
                                    Wishlist
                                </NavLink>
                            )}
                            {!user ? (
                                <div className="flex gap-2 pt-3 flex-col">
                                    <Link
                                        to="/login"
                                        onClick={() => setMenuOpen(false)}
                                        className="w-full text-center px-4 py-2 text-sm font-medium border border-orange-400 text-orange-500 rounded-md hover:bg-orange-400/10 transition"
                                    >
                                        Login
                                    </Link>

                                    <Link
                                        to="/register"
                                        onClick={() => setMenuOpen(false)}
                                        className="w-full text-center px-4 py-2 text-sm font-medium bg-gradient-to-r from-orange-400 to-yellow-400 text-white rounded-md hover:brightness-110 transition"
                                    >
                                        Register
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    onClick={() => {
                                        logoutUser();
                                        setMenuOpen(false);
                                    }}
                                    className="w-full text-center px-4 py-2 text-sm font-medium border border-orange-400 text-orange-500 rounded-md hover:bg-orange-400/10 transition flex items-center justify-center gap-2"
                                >
                                    <User size={18} /> Logout
                                </button>
                            )}
                        </div>
                    </div>
                )
            }
        </header >
    );
};

export default Navbar;
