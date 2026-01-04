import { useNavigate } from "react-router-dom";
import { Settings, LogOut, ChevronRight, Bell, DollarSign, Globe } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { UserProfile } from "@/types";

export function ProfilePage() {
    const navigate = useNavigate();
    const [user, setUser] = useLocalStorage<UserProfile | null>("finance-pwa-user", null);

    const handleLogout = () => {
        setUser(null);
        navigate("/auth");
    };

    if (!user) {
        // Redirect if no user (handled by protected route usually, but safe fallback)
        return (
            <PageShell className="flex items-center justify-center">
                <Button onClick={() => navigate("/auth")}>Sign In</Button>
            </PageShell>
        );
    }

    return (
        <PageShell>
            <header className="flex flex-col items-center pt-4 pb-6">
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
            </header>

            <main className="flex flex-col gap-6">
                {/* Profile Card */}
                <Card className="flex items-center gap-4">
                    <img
                        src={user.avatarUrl || "https://via.placeholder.com/150"}
                        alt={user.name}
                        className="w-16 h-16 rounded-full object-cover shadow-sm"
                    />
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{user.name}</h2>
                        <p className="text-sm text-gray-500">{user.email}</p>
                        <p className="text-xs text-gray-400 mt-1">Member since {new Date(user.joinDate).getFullYear()}</p>
                    </div>
                </Card>

                {/* Settings List */}
                <div className="space-y-2">
                    <SettingsRow icon={Globe} label="Language" value="English" />
                    <SettingsRow icon={DollarSign} label="Currency" value="USD ($)" />
                    <SettingsRow icon={Bell} label="Notifications" value="On" />
                    <SettingsRow icon={Settings} label="App Settings" />
                </div>

                <Button
                    variant="danger"
                    fullWidth
                    onClick={handleLogout}
                    className="mt-4"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log Out
                </Button>
            </main>
        </PageShell>
    );
}

function SettingsRow({ icon: Icon, label, value }: { icon: any, label: string, value?: string }) {
    return (
        <button className="w-full flex items-center justify-between p-4 bg-white/60 backdrop-blur-sm rounded-2xl hover:bg-white/80 transition-colors">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-full shadow-sm text-gray-600">
                    <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-900">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {value && <span className="text-sm text-gray-500">{value}</span>}
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        </button>
    );
}
