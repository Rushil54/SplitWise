import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import CreateGroupModal from '../components/CreateGroupModal';
import EditProfileModal from '../components/EditProfileModal';
import GroupList from '../components/GroupList';
import { cn } from '../lib/utils';
import { Plus, Settings, TrendingUp, TrendingDown, Wallet, LogOut, Loader2, ArrowUpRight, ArrowDownLeft, Users, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import axios from 'axios';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [groups, setGroups] = useState([]);
    const [recentExpenses, setRecentExpenses] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Stats
    const [toPay, setToPay] = useState(0);
    const [toReceive, setToReceive] = useState(0);
    const [availableBalance, setAvailableBalance] = useState(0);
    const [groupStats, setGroupStats] = useState({});
    const [friendBalances, setFriendBalances] = useState({});

    useEffect(() => {
        fetchDashboardData();
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user) return;
        try {
            const [groupsRes, expensesRes] = await Promise.all([
                axios.get('http://localhost:5000/api/groups'),
                axios.get('http://localhost:5000/api/expenses/my-expenses')
            ]);

            setGroups(groupsRes.data);
            setRecentExpenses(expensesRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)); // Last 5
            calculateDashboardBalances(expensesRes.data, groupsRes.data, user._id);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateDashboardBalances = (allExpenses, allGroups, userId) => {
        let pay = 0;
        let receive = 0;
        const groupStatsTemp = {};
        const friendStatsTemp = {}; // { 'Friend Name': amount }

        // 1. Initialize stats for each group
        allGroups.forEach(g => {
            const myMember = g.members.find(m => m.userId === userId);
            groupStatsTemp[g._id] = {
                initial: myMember ? myMember.initialBalance || 0 : 0,
                spent: 0,
                paid: 0,
                remaining: 0
            };
        });

        // 2. Iterate expenses
        allExpenses.forEach(exp => {
            if (groupStatsTemp[exp.groupId]) {
                const myShare = exp.myShare;

                if (exp.isPayer) {
                    // I paid, so I am owed (amount - myShare)
                    receive += (exp.amount - myShare);
                    groupStatsTemp[exp.groupId].paid += exp.amount;

                    exp.splits.forEach(split => {
                        // If I paid, and this split is not me, they owe me.
                        if (split.amount > 0 && split.memberId !== exp.payer.id) {
                            const friendName = split.name;
                            friendStatsTemp[friendName] = (friendStatsTemp[friendName] || 0) + split.amount;
                        }
                    });

                } else {
                    // I didn't pay, so I owe myShare to the Payer
                    pay += myShare;
                    const payerName = exp.payer.name;
                    friendStatsTemp[payerName] = (friendStatsTemp[payerName] || 0) - myShare;
                }
                groupStatsTemp[exp.groupId].spent += myShare;
            }
        });

        // 3. Aggregate totals
        let totalAvailable = 0;
        Object.values(groupStatsTemp).forEach(s => {
            s.remaining = s.initial - s.spent;
            totalAvailable += s.remaining;
        });

        setToPay(pay);
        setToReceive(receive);
        setAvailableBalance(totalAvailable);
        setGroupStats(groupStatsTemp);
        setFriendBalances(friendStatsTemp);
    };

    const handleGroupCreated = (newGroup) => {
        setGroups([newGroup, ...groups]);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;
    }

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 glass border-b border-white/5">
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="font-bold text-xl tracking-tight flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">S</div>
                        <span className="text-white hidden sm:inline-block">SplitMint</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 mr-2">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Welcome,</span>
                            <span className="text-sm font-semibold text-white">{user?.name}</span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                            onClick={() => setShowProfileModal(true)}
                        >
                            <Settings size={20} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                            onClick={logout}
                        >
                            <LogOut size={20} />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">

                {/* Welcome & Stats */}
                <section className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                                {getGreeting()}, <span className="text-gradient">{user?.name?.split(' ')[0]}</span>
                            </h1>
                            <p className="text-gray-400 font-medium">Here&#39;s your financial overview.</p>
                        </div>
                        <Button onClick={() => setShowCreateModal(true)} className="bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/5 transition-all hover:-translate-y-0.5 font-semibold">
                            <Plus className="mr-2 h-4 w-4" /> New Group
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Available Balance Card */}
                        <div className="relative group overflow-hidden rounded-2xl p-1 bg-gradient-to-br from-gray-800 to-black border border-white/5 shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-emerald-500/5 group-hover:from-indigo-500/20 transition-all duration-500" />
                            <div className="relative z-10 bg-gray-950/50 backdrop-blur-xl h-full p-6 rounded-xl flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center gap-2 text-indigo-300 mb-2 text-xs font-bold uppercase tracking-wider">
                                        <Wallet size={14} /> Total Balance
                                    </div>
                                    <div className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">
                                        ₹{availableBalance.toFixed(2)}
                                    </div>
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5 group-hover:border-white/10 transition-colors">
                                        All groups combined
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${availableBalance >= 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* To Receive Card */}
                        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-emerald-500/30 transition-colors duration-300">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">To Receive</span>
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">₹{toReceive.toFixed(2)}</p>
                                <p className="text-xs text-emerald-400 font-medium flex items-center">
                                    <ArrowUpRight size={12} className="mr-1" /> from {Object.values(groupStats).filter(s => s.paid > s.spent).length} groups
                                </p>
                            </div>
                        </div>

                        {/* To Pay Card */}
                        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:border-red-500/30 transition-colors duration-300">
                            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all duration-500"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-red-500/10 ring-1 ring-red-500/20 text-red-400 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <TrendingDown size={20} />
                                    </div>
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">To Pay</span>
                                </div>
                                <p className="text-3xl font-bold text-white mb-2">₹{toPay.toFixed(2)}</p>
                                <p className="text-xs text-red-400 font-medium flex items-center">
                                    <ArrowDownLeft size={12} className="mr-1" /> in {Object.values(groupStats).filter(s => s.spent > s.paid).length} groups
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    {/* Groups List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users size={20} className="text-gray-400" />
                                Your Groups
                            </h2>
                        </div>
                        <div className="space-y-4">
                            {/* Updated GroupList content logic would be passed here ideally or we style the GroupList component if it's separate. 
                                Assuming GroupList handles its own mapping, we might need to update GroupList.jsx separately or inject styles.
                                For now, relying on global CSS and GroupList component. 
                                Wait, GroupList is a component. I should update it too if I want deep changes, but plan said Dashboard.jsx styling.
                                Let's wrap it in a cleaner container if possible, or assume it inherits text colors.
                            */}
                            <GroupList groups={groups} stats={groupStats} />
                        </div>
                    </div>

                    {/* Right Column: Friend Balances & Recent Activity */}
                    <div className="space-y-6">

                        {/* Minimal Settlement Suggestions (Friend Balances) */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-4 border-b border-white/5 bg-white/5 flex justify-between items-center">
                                <h2 className="text-sm font-bold text-gray-200 flex items-center gap-2 uppercase tracking-wide">
                                    <CheckCircle2 size={16} className="text-indigo-400" /> Settlements
                                </h2>
                            </div>
                            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto custom-scrollbar">
                                {Object.keys(friendBalances).length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">All settled up!</div>
                                ) : (
                                    Object.entries(friendBalances)
                                        .filter(([, amount]) => Math.abs(amount) > 1)
                                        .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                                        .map(([name, amount]) => (
                                            <div key={name} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xs font-bold text-gray-300 ring-1 ring-white/10">
                                                            {name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-gray-200 text-sm">{name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={cn("text-sm font-bold block", amount > 0 ? "text-emerald-400" : "text-red-400")}>
                                                            {amount > 0 ? "owes you" : "you owe"}
                                                        </span>
                                                        <span className={cn("text-xs font-semibold opacity-80", amount > 0 ? "text-emerald-400" : "text-red-400")}>
                                                            ₹{Math.abs(amount).toFixed(0)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Action Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full text-xs h-8 bg-transparent border-white/20 text-gray-300 hover:bg-white/10 hover:text-white"
                                                >
                                                    {amount > 0 ? "Remind" : "Settle Up"}
                                                </Button>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="glass-card rounded-2xl p-1">
                            <div className="p-4 border-b border-white/5">
                                <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">Recent Activity</h2>
                            </div>
                            <div className="p-2 space-y-1">
                                {recentExpenses.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">No recent activity</div>
                                ) : (
                                    recentExpenses.map(exp => (
                                        <div key={exp._id} className="p-3 flex items-center justify-between hover:bg-white/5 rounded-lg transition-colors group cursor-default">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 text-xs font-bold uppercase border border-white/10 group-hover:border-indigo-500/30 group-hover:text-indigo-400 transition-colors">
                                                    {exp.groupName?.charAt(0) || 'G'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors line-clamp-1">{exp.description}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider">{exp.groupName}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("text-sm font-bold", exp.isPayer ? "text-emerald-400" : "text-gray-300")}>
                                                    {exp.isPayer ? `+₹${(exp.amount - exp.myShare).toFixed(0)}` : `-₹${exp.myShare.toFixed(0)}`}
                                                </p>
                                                <p className="text-[10px] text-gray-600">{new Date(exp.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {showCreateModal && (
                    <CreateGroupModal
                        onClose={() => setShowCreateModal(false)}
                        onGroupCreated={handleGroupCreated}
                    />
                )}

                {showProfileModal && (
                    <EditProfileModal onClose={() => setShowProfileModal(false)} />
                )}
            </main>
        </div>
    );
}
