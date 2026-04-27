"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, parseISO } from "date-fns";

const CATEGORIES = ["OPT", "CPT", "Travel", "Tax", "Housing", "Employment", "Visa Renewal", "General"];

export default function CommunityPage() {
  const supabase = createClient();
  const [posts, setPosts] = useState<any[]>([]);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [answerForms, setAnswerForms] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAnswer, setSavingAnswer] = useState<string | null>(null);
  const [filter, setFilter] = useState("All");
  const [, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", body: "", category: "OPT", isAnonymous: false });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id ?? null);
      const { data } = await supabase
        .from("community_posts")
        .select("*, users(name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      setPosts(data ?? []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAnswers(postId: string) {
    if (answers[postId]) return; // already loaded
    const res = await fetch(`/api/community/answers?postId=${postId}`);
    const json = await res.json();
    if (json.success) setAnswers(a => ({ ...a, [postId]: json.data }));
  }

  function togglePost(postId: string) {
    if (expandedPost === postId) {
      setExpandedPost(null);
    } else {
      setExpandedPost(postId);
      loadAnswers(postId);
    }
  }

  async function savePost() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("community_posts")
      .insert({ user_id: user.id, title: form.title, body: form.body, category: form.category, is_anonymous: form.isAnonymous })
      .select("*, users(name)")
      .single();
    if (data) setPosts(p => [data, ...p]);
    setShowForm(false);
    setForm({ title: "", body: "", category: "OPT", isAnonymous: false });
    setSaving(false);
  }

  async function submitAnswer(postId: string) {
    const body = answerForms[postId]?.trim();
    if (!body || body.length < 10) return;
    setSavingAnswer(postId);

    const res = await fetch("/api/community/answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, body }),
    });
    const json = await res.json();
    if (json.success) {
      setAnswers(a => ({ ...a, [postId]: [...(a[postId] ?? []), json.data] }));
      setAnswerForms(f => ({ ...f, [postId]: "" }));
      setPosts(p => p.map(post => post.id === postId ? { ...post, answer_count: (post.answer_count ?? 0) + 1 } : post));
    }
    setSavingAnswer(null);
  }

  async function upvote(id: string) {
    const res = await fetch("/api/community/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "post", id }),
    });
    const json = await res.json();
    if (json.success) {
      setPosts(p => p.map(post => post.id === id ? { ...post, upvotes: json.data.upvotes } : post));
    }
  }

  async function upvoteAnswer(postId: string, answerId: string) {
    const res = await fetch("/api/community/upvote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "answer", id: answerId }),
    });
    const json = await res.json();
    if (json.success) {
      setAnswers(a => ({ ...a, [postId]: a[postId].map(ans => ans.id === answerId ? { ...ans, upvotes: json.data.upvotes } : ans) }));
    }
  }

  const filtered = filter === "All" ? posts : posts.filter(p => p.category === filter);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Community Q&A</h1>
          <p className="text-slate-400 text-sm">Ask questions, share knowledge with fellow F-1 students</p>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Ask a Question</Button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === c ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-700"}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Post form */}
      {showForm && (
        <Card className="border-indigo-800/50">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-medium text-white">Ask the Community</h3>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Question Title *</label>
              <Input placeholder="e.g., Can I change employers during STEM OPT?" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1.5">Details *</label>
              <Textarea placeholder="Provide context — your program, current status, what you've already tried..." value={form.body} onChange={(e) => setForm(f => ({ ...f, body: e.target.value }))} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Category</label>
                <Select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input type="checkbox" checked={form.isAnonymous} onChange={(e) => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
                  Post anonymously
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={savePost} loading={saving} disabled={!form.title || form.body.length < 20}>Post Question</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-3xl mb-2">💬</p>
            <p>No posts in this category yet — be the first to ask!</p>
          </div>
        ) : (
          filtered.map((post) => {
            const isExpanded = expandedPost === post.id;
            const postAnswers = answers[post.id] ?? [];

            return (
              <Card key={post.id} className={`transition-colors ${isExpanded ? "border-slate-700" : "hover:border-slate-700"}`}>
                <CardContent className="p-5">
                  {/* Post header */}
                  <div className="flex items-start gap-3">
                    {/* Upvote */}
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                      <button onClick={() => upvote(post.id)}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-400 flex items-center justify-center transition-colors text-xs">
                        ▲
                      </button>
                      <span className="text-sm text-slate-400 font-medium">{post.upvotes}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <button className="text-left w-full" onClick={() => togglePost(post.id)}>
                        <div className="flex items-start gap-2 flex-wrap mb-1">
                          <h3 className="text-white font-medium hover:text-indigo-300 transition-colors">{post.title}</h3>
                          <Badge variant="info" className="text-xs flex-shrink-0">{post.category}</Badge>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">{post.body}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>{post.is_anonymous ? "Anonymous" : (post.users?.name ?? "Student")}</span>
                          <span>·</span>
                          <span>{formatDistanceToNow(parseISO(post.created_at), { addSuffix: true })}</span>
                          <span>·</span>
                          <span className="text-indigo-400">{post.answer_count} answer{post.answer_count !== 1 ? "s" : ""}</span>
                          <span className="text-indigo-400">{isExpanded ? "▲ collapse" : "▼ expand"}</span>
                        </div>
                      </button>

                      {/* Expanded answers */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3">
                          <div className="border-t border-slate-800 pt-4">
                            {/* Full post body */}
                            <p className="text-sm text-slate-300 leading-relaxed mb-4">{post.body}</p>

                            {/* Answers */}
                            {postAnswers.length > 0 ? (
                              <div className="space-y-3 mb-4">
                                <p className="text-xs text-slate-500 uppercase tracking-wider">{postAnswers.length} Answer{postAnswers.length !== 1 ? "s" : ""}</p>
                                {postAnswers.map((ans) => (
                                  <div key={ans.id} className="flex gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                      <button onClick={() => upvoteAnswer(post.id, ans.id)}
                                        className="w-6 h-6 rounded bg-slate-700 hover:bg-indigo-600/20 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-colors text-xs">
                                        ▲
                                      </button>
                                      <span className="text-xs text-slate-500">{ans.upvotes}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {ans.is_verified && (
                                        <Badge variant="success" className="text-xs mb-1">✓ Verified</Badge>
                                      )}
                                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{ans.body}</p>
                                      <p className="text-xs text-slate-500 mt-1">
                                        {ans.users?.name ?? "Student"} · {formatDistanceToNow(parseISO(ans.created_at), { addSuffix: true })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 mb-3">No answers yet — be the first to help!</p>
                            )}

                            {/* Answer form */}
                            <div className="space-y-2">
                              <Textarea
                                placeholder="Write your answer... (minimum 10 characters)"
                                value={answerForms[post.id] ?? ""}
                                onChange={(e) => setAnswerForms(f => ({ ...f, [post.id]: e.target.value }))}
                                rows={3}
                              />
                              <Button
                                size="sm"
                                onClick={() => submitAnswer(post.id)}
                                loading={savingAnswer === post.id}
                                disabled={(answerForms[post.id]?.length ?? 0) < 10}
                              >
                                Post Answer
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
