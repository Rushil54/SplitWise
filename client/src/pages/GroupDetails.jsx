import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ArrowLeft, Plus, Receipt, Trash2, Edit2, Search, ArrowRightLeft, Filter, Wallet, TrendingUp, TrendingDown, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import AddExpenseModal from '../components/AddExpenseModal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function GroupDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [loading, setLoading] = useState(true);
    const [editingExpense, setEditingExpense] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchGroupData();
    }, [id]);

    const fetchGroupData = async () => {
        try {
            setError(null);
            const [groupRes, expenseRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/groups/${id}`),
                axios.get(`http://localhost:5000/api/expenses/group/${id}`)
            ]);
            setGroup(groupRes.data);
            setExpenses(expenseRes.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || 'Failed to load group');
        } finally {
            setLoading(false);
        }
    };

    const deleteExpense = async (expenseId) => {
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/expenses/${expenseId}`);
            setExpenses(expenses.filter(e => e._id !== expenseId));
        } catch (err) {
            alert("Failed to delete expense");
        }
    };

    const calculateBalances = () => {
        if (!group || !expenses) return {};
        // Logic to simplify debt (basic net balance)
        const balances = {}; // { userId: netAmount }

        // Init 0
        group.members.forEach(m => balances[m._id] = 0);

        expenses.forEach(exp => {
            const payerId = exp.payer;
            const amount = exp.amount;

            // Payer gets +amount (they are owed this much initially)
            if (balances[payerId] !== undefined) balances[payerId] += amount;

            // Subtract splits
            exp.splits.forEach(split => {
                if (balances[split.memberId] !== undefined) {
                    balances[split.memberId] -= split.amount;
                }
            });
        });

        return balances;
    };

    const simplifyDebts = (balances) => {
        const debtors = [];
        const creditors = [];

        Object.entries(balances).forEach(([id, amount]) => {
            if (amount < -0.01) debtors.push({ id, amount });
            if (amount > 0.01) creditors.push({ id, amount });
        });

        debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
        creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

        const transactions = [];
        let i = 0; // debtor index
        let j = 0; // creditor index

        while (i < debtors.length && j < creditors.length) {
            const debtor = debtors[i];
            const creditor = creditors[j];

            // The amount to settle is the minimum of (abs(debt), credit)
            const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

            transactions.push({
                from: debtor.id,
                to: creditor.id,
                amount: amount
            });

            // Adjust remaining amounts
            debtor.amount += amount;
            creditor.amount -= amount;

            // Move indices if settled (approx zero)
            if (Math.abs(debtor.amount) < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }

        return transactions;
    };

    const deleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group? All expenses will be lost.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/groups/${id}`);
            navigate('/dashboard');
        } catch (err) {
            console.error(err);
            const msg = err.response?.data?.message || err.message || 'Failed to delete group';
            alert(`Error: ${msg}`);
        }
    };

    const [filterText, setFilterText] = useState('');
    const [filterPayer, setFilterPayer] = useState('all');
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterMinAmount, setFilterMinAmount] = useState('');
    const [filterMaxAmount, setFilterMaxAmount] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    if (loading) return <div className="p-8 text-white">Loading...</div>;
    // ... error handling ... 
    if (error) return (
        <div className="p-8 text-center text-red-500">
            <h2 className="text-xl font-bold">Error</h2>
            <p>{error}</p>
            <Link to="/dashboard" className="text-indigo-400 underline mt-4 inline-block">Back to Dashboard</Link>
        </div>
    );
    if (!group) return <div className="p-8 text-white">Group not found</div>;

    const balances = calculateBalances();
    const settlements = simplifyDebts(balances);

    // Filter Logic
    const filteredExpenses = expenses.filter(e => {
        // Text Match
        const textMatch = e.description.toLowerCase().includes(filterText.toLowerCase()) ||
            e.amount.toString().includes(filterText);

        // Payer Match
        const payerMatch = filterPayer === 'all' || e.payer === filterPayer;

        // Date Match
        let dateMatch = true;
        const expDate = new Date(e.date);
        if (filterDateStart) dateMatch = dateMatch && expDate >= new Date(filterDateStart);
        if (filterDateEnd) dateMatch = dateMatch && expDate <= new Date(filterDateEnd);

        // Amount Match
        let amountMatch = true;
        if (filterMinAmount) amountMatch = amountMatch && e.amount >= parseFloat(filterMinAmount);
        if (filterMaxAmount) amountMatch = amountMatch && e.amount <= parseFloat(filterMaxAmount);

        return textMatch && payerMatch && dateMatch && amountMatch;
    });

    // Chart Data
    const spendingData = group.members.map(m => {
        const totalPaid = expenses.filter(e => e.payer === m._id).reduce((sum, e) => sum + e.amount, 0);
        return { name: m.name, value: totalPaid };
    }).filter(d => d.value > 0);

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Calculation for Summary Cards
    const totalGroupSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Personalized Stats
    const { user } = useAuth();
    let myBalance = 0;

    if (user && group) {
        // Find user in group members to get their distinct ID within the group if needed, 
        // or match by userId if members structure has userId.
        const myMemberProfile = group.members.find(m => m.userId === user._id || m.email === user.email);
        if (myMemberProfile) {
            myBalance = balances[myMemberProfile._id] || 0;
        }
    }

    return (

        <div className="min-h-screen pb-12">
            {/* Header / Nav */}
            <div className="sticky top-0 z-50 glass border-b border-white/5">
                <div className="max-w-6xl mx-auto p-4 md:px-8 flex justify-between items-center">
                    <Link to="/dashboard" className="flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft size={16} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Dashboard
                    </Link>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}
                            className="bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/5 transition-all hover:-translate-y-0.5 font-semibold"
                        >
                            <Plus size={16} className="mr-2" /> Add Expense
                        </Button>
                        <Button variant="ghost" size="icon" onClick={deleteGroup} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 size={18} />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">

                {/* Group Title Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-2">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">{group.name}</h1>
                        <div className="flex flex-wrap items-center gap-2">
                            {group.members.map(m => (
                                <div key={m._id} className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-full text-xs font-medium text-gray-300">
                                    <div className="w-5 h-5 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-[10px] text-white font-bold ring-1 ring-white/10">
                                        {m.name.charAt(0)}
                                    </div>
                                    {m.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2 text-xs font-bold uppercase tracking-wider">
                            <Receipt size={14} /> Total Spending
                        </div>
                        <div className="text-3xl font-bold text-white">₹{totalGroupSpend.toFixed(2)}</div>
                    </div>

                    <div className={cn(
                        "rounded-2xl p-6 relative overflow-hidden border transition-all duration-300",
                        myBalance > 0 ? "bg-emerald-500/10 border-emerald-500/30" :
                            myBalance < 0 ? "bg-red-500/10 border-red-500/30" :
                                "glass-card border-white/5"
                    )}>
                        <div className={cn("text-xs font-bold uppercase tracking-wider flex items-center gap-2 mb-2",
                            myBalance > 0 ? "text-emerald-400" : myBalance < 0 ? "text-red-400" : "text-gray-400"
                        )}>
                            <Wallet size={14} /> Your Balance
                        </div>
                        <div className={cn("text-3xl font-bold",
                            myBalance > 0 ? "text-emerald-400" : myBalance < 0 ? "text-red-400" : "text-white"
                        )}>
                            {myBalance === 0 ? "All Settled" :
                                myBalance > 0 ? `+ ₹${myBalance.toFixed(2)}` : `- ₹${Math.abs(myBalance).toFixed(2)}`
                            }
                        </div>
                        <p className="text-xs text-gray-400 mt-1 font-medium opacity-80">
                            {myBalance > 0 ? "You receive" : myBalance < 0 ? "You pay" : "You are all clear"}
                        </p>
                    </div>

                    <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex items-center gap-2 text-gray-400 mb-2 text-xs font-bold uppercase tracking-wider">
                            <ArrowRightLeft size={14} /> Transactions
                        </div>
                        <div className="text-3xl font-bold text-white">{expenses.length}</div>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                    {/* Left Column: Transaction Feed */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex flex-col space-y-4 sticky top-20 bg-gray-950/80 backdrop-blur-md py-4 z-10 -mx-4 px-4 md:mx-0 md:px-0 md:rounded-xl">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    Recent Activity
                                </h2>
                                <div className="flex gap-2">
                                    <div className="relative w-full max-w-xs group">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                                        <Input
                                            placeholder="Search..."
                                            className="pl-9 h-9 bg-white/5 border-white/10 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all rounded-full text-sm w-32 md:w-48 text-white placeholder:text-gray-600"
                                            value={filterText}
                                            onChange={(e) => setFilterText(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        variant={showFilters ? "secondary" : "outline"}
                                        size="icon"
                                        className="rounded-full w-9 h-9 border-white/10 bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                                        onClick={() => setShowFilters(!showFilters)}
                                    >
                                        <Filter size={16} />
                                    </Button>
                                </div>
                            </div>

                            {showFilters && (
                                <div className="bg-gray-900/90 p-4 rounded-xl border border-white/10 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Participant</label>
                                        <select
                                            className="w-full text-sm border-white/10 rounded-md p-2 bg-white/5 text-white focus:bg-gray-800 transition-colors"
                                            value={filterPayer}
                                            onChange={(e) => setFilterPayer(e.target.value)}
                                        >
                                            <option value="all">All Members</option>
                                            {group.members.map(m => (
                                                <option key={m._id} value={m._id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Date Range</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="date"
                                                className="w-full text-sm border-white/10 rounded-md p-2 bg-white/5 text-white focus:bg-gray-800"
                                                value={filterDateStart}
                                                onChange={(e) => setFilterDateStart(e.target.value)}
                                            />
                                            <input
                                                type="date"
                                                className="w-full text-sm border-white/10 rounded-md p-2 bg-white/5 text-white focus:bg-gray-800"
                                                value={filterDateEnd}
                                                onChange={(e) => setFilterDateEnd(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-gray-500 mb-1 block">Amount</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                placeholder="Min"
                                                className="w-full text-sm border-white/10 rounded-md p-2 bg-white/5 text-white placeholder:text-gray-600 focus:bg-gray-800"
                                                value={filterMinAmount}
                                                onChange={(e) => setFilterMinAmount(e.target.value)}
                                            />
                                            <span className="text-gray-600">-</span>
                                            <input
                                                type="number"
                                                placeholder="Max"
                                                className="w-full text-sm border-white/10 rounded-md p-2 bg-white/5 text-white placeholder:text-gray-600 focus:bg-gray-800"
                                                value={filterMaxAmount}
                                                onChange={(e) => setFilterMaxAmount(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="md:col-span-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                            onClick={() => {
                                                setFilterText('');
                                                setFilterPayer('all');
                                                setFilterDateStart('');
                                                setFilterDateEnd('');
                                                setFilterMinAmount('');
                                                setFilterMaxAmount('');
                                            }}
                                        >
                                            Clear Filters
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {expenses.length === 0 ? (
                                <div className="text-center py-16 glass-card rounded-2xl border-white/10 border-dashed">
                                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Receipt className="text-gray-600" size={32} />
                                    </div>
                                    <h3 className="text-lg font-medium text-white">No expenses yet</h3>
                                    <p className="text-gray-500 text-sm mt-1">Add your first expense to get started.</p>
                                </div>
                            ) : filteredExpenses.length === 0 ? (
                                <div className="text-center py-16 glass-card rounded-2xl border-white/10 border-dashed">
                                    <p className="text-gray-500">No expenses match your filters.</p>
                                </div>
                            ) : (
                                filteredExpenses.map(expense => (
                                    <div key={expense._id} className="glass-card p-5 rounded-2xl border-white/5 hover:border-indigo-500/30 transition-all group relative">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4 items-center">
                                                {/* Date Badge */}
                                                <div className="w-14 h-14 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                                                    <span className="text-xs uppercase font-bold text-gray-500 tracking-wider">
                                                        {new Date(expense.date).toLocaleDateString(undefined, { month: 'short' })}
                                                    </span>
                                                    <span className="text-xl font-bold text-white leading-none mt-0.5">
                                                        {new Date(expense.date).getDate()}
                                                    </span>
                                                </div>

                                                {/* Content */}
                                                <div>
                                                    <h3 className="font-bold text-base text-gray-200 group-hover:text-white transition-colors">
                                                        {expense.description}
                                                    </h3>
                                                    <p className="text-sm text-gray-400 mt-0.5">
                                                        <span className="font-medium text-gray-300">
                                                            {group.members.find(m => m._id === expense.payer)?.name || 'Unknown'}
                                                        </span> paid <span className="font-semibold text-white">₹{expense.amount.toFixed(2)}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Amount */}
                                            <div className="text-right">
                                                <div className="bg-white/5 border border-white/5 px-3 py-1 rounded-full text-xs font-semibold text-gray-400 uppercase tracking-wide inline-block mb-1">
                                                    {expense.splitType}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-4 right-4 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-indigo-400 hover:bg-white/10" onClick={() => { setEditingExpense(expense); setShowAddExpense(true); }}>
                                                <Edit2 size={14} />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-500/10" onClick={() => deleteExpense(expense._id)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Stats & Insights */}
                    <div className="space-y-6">
                        {/* Suggested Payments - Replaces "How to Settle" */}
                        <Card className="glass-card border-white/10 overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-emerald-500" /> Suggested Payments
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                {settlements.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">
                                        <p>Everything is settled up!</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {settlements.map((txn, idx) => {
                                            const fromName = group.members.find(m => m._id === txn.from)?.name || 'Someone';
                                            const toName = group.members.find(m => m._id === txn.to)?.name || 'Someone';
                                            return (
                                                <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <span className="font-semibold text-gray-300">{fromName}</span>
                                                            <span className="text-gray-500 text-xs font-medium">pays</span>
                                                            <span className="font-semibold text-gray-300">{toName}</span>
                                                        </div>
                                                    </div>
                                                    <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-sm">
                                                        ₹{txn.amount.toFixed(2)}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Analysis Card */}
                        <Card className="glass-card border-white/10 overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                                    <TrendingUp size={16} className="text-indigo-500" /> Spending Analysis
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-48 w-full">
                                    {spendingData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={spendingData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={50}
                                                    outerRadius={70}
                                                    paddingAngle={4}
                                                    dataKey="value"
                                                    stroke="rgba(0,0,0,0)"
                                                >
                                                    {spendingData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#111827', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                    itemStyle={{ color: '#fff' }}
                                                    formatter={(value) => [`₹${value.toFixed(2)}`, 'Paid']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-gray-500 text-xs">Not enough data</div>
                                    )}
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-2">
                                    {spendingData.map((entry, index) => (
                                        <div key={index} className="flex items-center gap-2 text-xs">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                            <span className="text-gray-400 truncate">{entry.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Balances Card */}
                        <Card className="glass-card border-white/10 overflow-hidden">
                            <CardHeader className="bg-white/5 border-b border-white/5 pb-3">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-300">Member Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-white/5">
                                    {group.members.map(member => {
                                        const bal = balances[member._id] || 0;
                                        const displayBal = Math.abs(bal) < 0.01 ? 0 : bal;
                                        const totalPaid = expenses.filter(e => e.payer === member._id).reduce((sum, e) => sum + e.amount, 0);
                                        const totalShare = totalPaid - bal;
                                        const initial = member.initialBalance || 0;
                                        const remaining = initial - totalShare;

                                        return (
                                            <div key={member._id} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="font-semibold text-gray-300 text-sm">{member.name}</div>
                                                    <div className={cn("font-bold text-sm",
                                                        displayBal > 0.01 ? "text-emerald-400" :
                                                            displayBal < -0.01 ? "text-red-400" : "text-gray-500"
                                                    )}>
                                                        {displayBal > 0.01 ? `Gets ₹${displayBal.toFixed(2)}` :
                                                            displayBal < -0.01 ? `Pays ₹${Math.abs(displayBal).toFixed(2)}` : "Settled"}
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                                    <span>Spent: ₹{totalShare.toFixed(0)}</span>
                                                    <span className={cn(remaining < 0 ? "text-red-400 font-medium" : "text-gray-500")}>
                                                        Rem: ₹{remaining.toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {showAddExpense && (
                    <AddExpenseModal
                        group={group}
                        existingExpense={editingExpense}
                        onClose={() => setShowAddExpense(false)}
                        onExpenseAdded={() => {
                            fetchGroupData();
                        }}
                    />
                )}
            </div>
        </div>
    );
}
