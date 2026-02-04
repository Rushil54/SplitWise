import { Link } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Users, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';

export default function GroupList({ groups, stats = {} }) {
    if (!groups.length) {
        return (
            <div className="text-center p-12 glass dark:bg-white/5 rounded-2xl border border-dashed border-white/10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="text-gray-500" size={32} />
                </div>
                <h3 className="text-lg font-medium text-white mb-1">No groups yet</h3>
                <p className="text-gray-400">Create a group to start tracking expenses.</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {groups.map(group => {
                const groupStat = stats[group._id] || { spent: 0, remaining: 0 };
                return (
                    <Link key={group._id} to={`/groups/${group._id}`} className="block group relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="glass-card hover:border-indigo-500/30 transition-all duration-300 h-full relative z-10">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-lg font-bold text-white shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
                                            {group.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {group.name}
                                            </h3>
                                            <div className="flex items-center text-gray-400 text-xs mt-1">
                                                <Users size={12} className="mr-1" />
                                                <span>{group.members.length} members</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center -mr-2 -mt-2 group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                                        <ArrowRight size={16} className="text-gray-500 group-hover:text-indigo-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6 bg-white/5 rounded-lg p-3 border border-white/5">
                                    <div>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">You Spent</span>
                                        <span className="font-bold text-gray-200">₹{groupStat.spent.toFixed(0)}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Your Balance</span>
                                        <span className={cn("font-bold", groupStat.remaining < 0 ? "text-red-400" : "text-emerald-400")}>
                                            {groupStat.remaining > 0 ? '+' : ''}₹{groupStat.remaining.toFixed(0)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex -space-x-3 overflow-hidden pl-1">
                                        {group.members.slice(0, 4).map((member, i) => (
                                            <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0F172A] bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 relative z-0" title={member.name}>
                                                {member.avatar ? (
                                                    <img src={member.avatar} alt={member.name} className="h-full w-full rounded-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerText = member.name.charAt(0) }} />
                                                ) : member.name.charAt(0)}
                                            </div>
                                        ))}
                                        {group.members.length > 4 && (
                                            <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#0F172A] bg-gray-900 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                                +{group.members.length - 4}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                                        View Details
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                );
            })}
        </div>
    );
}
