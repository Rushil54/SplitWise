import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './ui/card';
import { X } from 'lucide-react';
import axios from 'axios';

export default function EditProfileModal({ onClose }) {
    const { user, login } = useAuth(); // We'll use login to update the context state
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const res = await axios.put('http://localhost:5000/api/auth/me', { name }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update local context
            // We can re-use the login function or add a specific update function to context. 
            // For simplicity, we just manually update the user object in context if possible, 
            // OR we just assume `login` can handle specific object updates if we designed it that way.
            // But `login` expects token. The backend returned user + token.
            login(res.data.token, res.data);

            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-sm relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <X size={20} />
                </button>
                <CardHeader>
                    <CardTitle>Edit Profile</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase text-gray-500">Full Name</label>
                            <Input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
