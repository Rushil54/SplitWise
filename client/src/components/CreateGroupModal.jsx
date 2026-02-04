import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import axios from 'axios';
import { X, Plus, Trash2 } from 'lucide-react';

export default function CreateGroupModal({ onClose, onGroupCreated }) {
    const [name, setName] = useState('');
    const [members, setMembers] = useState([]);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberInitialBalance, setNewMemberInitialBalance] = useState('');
    const [ownerInitialBalance, setOwnerInitialBalance] = useState('');
    const [error, setError] = useState('');

    const addMember = () => {
        if (!newMemberName) return;
        if (members.length >= 3) {
            setError('Max 3 additional members allowed');
            return;
        }
        setMembers([...members, { name: newMemberName, initialBalance: parseFloat(newMemberInitialBalance) || 0 }]);
        setNewMemberName('');
        setNewMemberInitialBalance('');
        setError('');
    };

    const removeMember = (index) => {
        const updated = members.filter((_, i) => i !== index);
        setMembers(updated);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name) {
            setError('Group name is required');
            return;
        }

        try {
            const res = await axios.post('http://localhost:5000/api/groups', {
                name,
                members,
                ownerInitialBalance: parseFloat(ownerInitialBalance) || 0
            });
            onGroupCreated(res.data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create group');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <X size={20} />
                </button>
                <CardHeader>
                    <CardTitle>Create New Group</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Group Name</label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Trip to Goa"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Your Initial Budget (₹)</label>
                                <Input
                                    type="number"
                                    value={ownerInitialBalance}
                                    onChange={(e) => setOwnerInitialBalance(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Add Members (Optional)</label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    placeholder="Name"
                                    value={newMemberName}
                                    onChange={(e) => setNewMemberName(e.target.value)}
                                />
                                <Input
                                    placeholder="Initial ₹"
                                    type="number"
                                    className="w-24"
                                    value={newMemberInitialBalance}
                                    onChange={(e) => setNewMemberInitialBalance(e.target.value)}
                                    title="Initial Balance"
                                />
                                <Button onClick={addMember} type="button" size="icon" variant="outline">
                                    <Plus size={18} />
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500 mb-2">Enter name and initial budget/deposit (optional).</p>

                            {members.length > 0 && (
                                <ul className="space-y-2 mt-2">
                                    {members.map((m, i) => (
                                        <li key={i} className="flex justify-between items-center bg-gray-50 p-2 rounded text-sm">
                                            <span>
                                                {m.name}
                                                {m.initialBalance > 0 && <span className="text-emerald-600 font-semibold ml-2">₹{m.initialBalance}</span>}
                                            </span>
                                            <button onClick={() => removeMember(i)} className="text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                    </div>
                </CardContent>
                <CardFooter className="justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>Create Group</Button>
                </CardFooter>
            </Card>
        </div>
    );
}
