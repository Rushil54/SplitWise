import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { X } from 'lucide-react';
import axios from 'axios';
import { cn } from '../lib/utils';

export default function AddExpenseModal({ group, existingExpense, onClose, onExpenseAdded }) {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payer, setPayer] = useState('');
    const [splitType, setSplitType] = useState('EQUAL'); // EQUAL, EXACT, PERCENT
    const [splits, setSplits] = useState({}); // { memberId: value }
    const [error, setError] = useState('');

    // Initialize data
    useEffect(() => {
        if (group && group.members.length > 0) {
            if (existingExpense) {
                // Editing Mode
                setDescription(existingExpense.description);
                setAmount(existingExpense.amount);
                setPayer(existingExpense.payer);
                setSplitType(existingExpense.splitType);

                const loadedSplits = {};
                existingExpense.splits.forEach(s => {
                    if (existingExpense.splitType === 'PERCENT') {
                        loadedSplits[s.memberId] = s.percent;
                    } else {
                        loadedSplits[s.memberId] = s.amount;
                    }
                });
                setSplits(loadedSplits);
            } else {
                // New Mode
                setPayer(group.members[0]._id);
                const initialSplits = {};
                group.members.forEach(m => initialSplits[m._id] = '');
                setSplits(initialSplits);
            }
        }
    }, [group, existingExpense]);

    const validateSplits = () => {
        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) return 'Invalid amount';

        if (splitType === 'EQUAL') return null;

        let currentTotal = 0;
        Object.values(splits).forEach(val => {
            currentTotal += parseFloat(val) || 0;
        });

        if (splitType === 'EXACT') {
            if (Math.abs(currentTotal - totalAmount) > 0.01) {
                return `Total splits ($${currentTotal}) must equal expense amount ($${totalAmount})`;
            }
        }

        if (splitType === 'PERCENT') {
            if (Math.abs(currentTotal - 100) > 0.01) {
                return `Total percentage (${currentTotal}%) must equal 100%`;
            }
        }

        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationError = validateSplits();
        if (validationError) {
            setError(validationError);
            return;
        }

        // Rounding & Split Calculation Logic
        const activeMembers = group.members.length;
        const expenseAmount = parseFloat(amount);

        const formattedSplits = group.members.map((member, index) => {
            let memberAmount = 0;
            let memberPercent = 0;

            if (splitType === 'EQUAL') {
                // Consistent Rounding Logic for EQUAL
                const baseAmount = Math.floor((expenseAmount / activeMembers) * 100) / 100;
                const remainder = Math.round((expenseAmount - (baseAmount * activeMembers)) * 100);

                // Distribute pennies to the first few members
                memberAmount = baseAmount + (index < remainder ? 0.01 : 0);

            } else if (splitType === 'EXACT') {
                memberAmount = parseFloat(splits[member._id]) || 0;
            } else if (splitType === 'PERCENT') {
                memberPercent = parseFloat(splits[member._id]) || 0;
                memberAmount = (expenseAmount * memberPercent) / 100;
            }

            return {
                memberId: member._id,
                amount: memberAmount,
                percent: memberPercent
            };
        });

        try {
            const payload = {
                description,
                amount: expenseAmount,
                groupId: group._id,
                payer,
                splitType,
                splits: formattedSplits
            };

            let res;
            if (existingExpense) {
                res = await axios.put(`http://localhost:5000/api/expenses/${existingExpense._id}`, payload);
            } else {
                res = await axios.post('http://localhost:5000/api/expenses', payload);
            }

            onExpenseAdded(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save expense');
        }
    };

    const handleSplitChange = (memberId, value) => {
        setSplits(prev => ({ ...prev, [memberId]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg relative animate-in fade-in zoom-in duration-200">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <X size={20} />
                </button>
                <CardHeader>
                    <CardTitle>{existingExpense ? 'Edit Expense' : 'Add Expense'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Description</label>
                            <Input
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="e.g. Dinner at Taj"
                                required
                            />
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-semibold uppercase text-gray-500">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2 text-gray-500">₹</span>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        className="pl-7"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Paid By</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border text-sm bg-background"
                                value={payer}
                                onChange={e => setPayer(e.target.value)}
                            >
                                {group.members.map(m => (
                                    <option key={m._id} value={m._id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500 mb-2 block">Split By</label>
                            <div className="flex rounded-md border p-1 bg-gray-50 dark:bg-gray-900">
                                {['EQUAL', 'EXACT', 'PERCENT'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setSplitType(type)}
                                        className={cn(
                                            "flex-1 text-xs py-1.5 rounded font-medium transition-all",
                                            splitType === type
                                                ? "bg-white dark:bg-gray-800 shadow text-primary"
                                                : "text-gray-500 hover:text-gray-900"
                                        )}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Split Inputs */}
                        {splitType !== 'EQUAL' && (
                            <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md space-y-2 max-h-40 overflow-y-auto">
                                {group.members.map(m => (
                                    <div key={m._id} className="flex items-center justify-between text-sm">
                                        <span>{m.name}</span>
                                        <div className="flex items-center gap-1 w-24">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                className="h-8 text-right"
                                                value={splits[m._id]}
                                                onChange={e => handleSplitChange(m._id, e.target.value)}
                                            />
                                            <span className="text-gray-400 text-xs">{splitType === 'PERCENT' ? '%' : '₹'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                        <Button type="submit" className="w-full size-lg text-base">
                            {existingExpense ? 'Save Changes' : 'Add Expense'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
