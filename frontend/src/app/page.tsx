'use client';

import React, { useState, useEffect } from 'react';

interface Post {
  _id: string;
  id?: string;
  topicId?: any;
  content: string;
  imageUrl?: string;
  aiPrompt?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';
  scheduledAt?: string;
  publishedAt?: string;
  platformPostId?: string;
  threadsPublishedPostId?: string;
  errorMessage?: string;
  createdAt: string;
}

interface Account {
  _id: string;
  id?: string;
  platform: string;
  accountName: string;
  accountId: string;
  accessToken: string;
  tokenExpires?: string;
  avatarUrl?: string;
}

const API_BASE = 'http://localhost:3001/api/v1';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'batch' | 'published' | 'posts' | 'accounts'>('batch');
  const [posts, setPosts] = useState<Post[]>([]);
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingPublishId, setLoadingPublishId] = useState<string | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);

  // Batch Topics State
  const [batchTopicsText, setBatchTopicsText] = useState<string>(
    '5 chiến lược phát triển bản thân cho lập trình viên\nPhương pháp quản lý thời gian Pomodoro tối ưu hiệu suất\n3 nguyên tắc xây dựng thương hiệu cá nhân bền vững\nCách chọn trang phục công sở tối giản nhưng vẫn sang trọng',
  );
  const [batchIntervalDays, setBatchIntervalDays] = useState<number>(1);
  const [batchPublishHour, setBatchPublishHour] = useState<number>(9);
  const [batchStartFromToday, setBatchStartFromToday] = useState<boolean>(true);
  const [batchStartDate, setBatchStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  // Manual Post & Schedule Date State
  const [showCreateManual, setShowCreateManual] = useState<boolean>(false);
  const [manualContent, setManualContent] = useState<string>('');
  const [manualImageUrl, setManualImageUrl] = useState<string>('');
  const [manualScheduledAt, setManualScheduledAt] = useState<string>('');
  const [editingPostScheduleId, setEditingPostScheduleId] = useState<string | null>(null);
  const [editingScheduleValue, setEditingScheduleValue] = useState<string>('');

  // Live Preview Selected Post State
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string>('');

  // Account Form State
  const [accName, setAccName] = useState('');
  const [accId, setAccId] = useState('');
  const [accToken, setAccToken] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
        if (data.length > 0 && !selectedPost) {
          setSelectedPost(data[0]);
          setPreviewContent(data[0].content);
          setPreviewImageUrl(data[0].imageUrl || '');
        }
      }
    } catch (e) {
      console.error('Fetch posts error', e);
    }
  };

  const fetchPublishedPosts = async () => {
    try {
      const res = await fetch(`${API_BASE}/posts/published`);
      if (res.ok) {
        const data = await res.json();
        setPublishedPosts(data);
      }
    } catch (e) {
      console.error('Fetch published posts error', e);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch(`${API_BASE}/accounts`);
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (e) {
      console.error('Fetch accounts error', e);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchPublishedPosts();
    fetchAccounts();

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const status = urlParams.get('status');
      const error = urlParams.get('error');
      if (status === 'threads_connected' || status === 'threads_connected_mock') {
        alert(
          status === 'threads_connected_mock'
            ? 'Đã kết nối Tài khoản Mô phỏng (Demo Mode)! Bạn có thể test Đăng bài thoải mái.'
            : 'Đăng nhập & Kết nối Threads thành công!',
        );
        setActiveTab('accounts');
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchAccounts();
      } else if (error) {
        alert(`Lỗi kết nối: ${error}`);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleBatchGenerate = async () => {
    const topicsList = batchTopicsText
      .split('\n')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    if (topicsList.length === 0) {
      alert('Vui lòng nhập ít nhất 1 chủ đề!');
      return;
    }

    setLoadingBatch(true);
    try {
      const res = await fetch(`${API_BASE}/scheduler/batch-generate-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicsList,
          intervalDays: batchIntervalDays,
          publishHour: batchPublishHour,
          generateImages: true,
          startDate: batchStartDate,
          startFromToday: batchStartFromToday,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Đã tự động tạo ${result.scheduledPostsCount} bài viết + sinh ảnh AI & lên lịch đăng (Bài 1 bắt đầu ${batchStartFromToday ? 'hôm nay' : 'ngày mai'}) thành công!`);
        fetchPosts();
        setActiveTab('posts');
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || 'Không thể tạo bài tự động'}`);
      }
    } catch (e: any) {
      alert(`Lỗi kết nối: ${e.message}`);
    } finally {
      setLoadingBatch(false);
    }
  };

  const handlePublishNow = async (post: Post | string) => {
    const postId = typeof post === 'string' ? post : post._id || post.id || '';
    if (!postId) {
      alert('Không tìm thấy ID bài viết!');
      return;
    }
    setLoadingPublishId(postId);
    try {
      const res = await fetch(`${API_BASE}/threads/publish/${postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        const result = await res.json();
        alert(`ĐÃ ĐĂNG BÀI LÊN THREADS THÀNH CÔNG!\nID Bài viết: ${result.threadsPublishedPostId || result.platformPostId || result._id}`);
        fetchPosts();
        fetchPublishedPosts();
        setActiveTab('published');
      } else {
        const err = await res.json();
        alert(`Đăng bài thất bại: ${err.message || 'Lỗi từ Meta API'}`);
      }
    } catch (e: any) {
      alert(`Lỗi hệ thống: ${e.message}`);
    } finally {
      setLoadingPublishId(null);
    }
  };

  const handleCreateManualPost = async (publishImmediately: boolean = false) => {
    if (!manualContent.trim()) {
      alert('Vui lòng nhập nội dung bài viết!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: manualContent,
          imageUrl: manualImageUrl.trim() || undefined,
          scheduledAt: manualScheduledAt ? new Date(manualScheduledAt).toISOString() : undefined,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setManualContent('');
        setManualImageUrl('');
        setManualScheduledAt('');
        setShowCreateManual(false);

        if (publishImmediately) {
          await handlePublishNow(created._id);
        } else {
          alert('Đã tạo bài viết và đặt lịch đăng thành công!');
          fetchPosts();
        }
      } else {
        const err = await res.json();
        alert(`Lỗi tạo bài viết: ${err.message}`);
      }
    } catch (e: any) {
      alert(`Lỗi hệ thống: ${e.message}`);
    }
  };

  const handleSaveScheduleDate = async (postId: string) => {
    if (!editingScheduleValue) {
      alert('Vui lòng chọn ngày & giờ đăng!');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledAt: new Date(editingScheduleValue).toISOString(),
          status: 'SCHEDULED',
        }),
      });

      if (res.ok) {
        alert('Đã cập nhật ngày & giờ đăng bài viết thành công!');
        setEditingPostScheduleId(null);
        fetchPosts();
      } else {
        const err = await res.json();
        alert(`Lỗi cập nhật: ${err.message}`);
      }
    } catch (e: any) {
      alert(`Lỗi: ${e.message}`);
    }
  };

  const handleManualConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName || !accId || !accToken) {
      alert('Vui lòng điền đầy đủ Tên tài khoản, User ID và Access Token!');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/accounts/threads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountName: accName.startsWith('@') ? accName : `@${accName}`,
          accountId: accId,
          accessToken: accToken,
        }),
      });

      if (res.ok) {
        alert('Lưu và kết nối Token Threads thành công!');
        setAccName('');
        setAccId('');
        setAccToken('');
        fetchAccounts();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (e: any) {
      alert(`Lỗi kết nối: ${e.message}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa bài viết này?')) return;
    try {
      const res = await fetch(`${API_BASE}/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPosts();
        fetchPublishedPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans p-6">
      {/* Header Bar */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center md:justify-between border-b border-neutral-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Social Auto Poster</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Hệ thống AI tự động sinh bài viết chuyên nghiệp, tạo ảnh banner &amp; đăng tự động lên Threads (MongoDB Database)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs px-3 py-1.5 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono">
            DB: MongoDB (Port 27018)
          </span>
          <span className="text-xs px-3 py-1.5 rounded-md bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono">
            Account: @hayabusa12121 (Active)
          </span>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <nav className="max-w-7xl mx-auto mb-6 flex flex-wrap gap-2 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab('batch')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'batch'
              ? 'bg-white text-neutral-950 font-semibold shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Tạo Bài Hàng Loạt (AI &amp; Ảnh)
        </button>

        <button
          onClick={() => {
            setActiveTab('published');
            fetchPublishedPosts();
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
            activeTab === 'published'
              ? 'bg-white text-neutral-950 font-semibold shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <span>Bài Đã Đăng</span>
          <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            {publishedPosts.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('posts');
            fetchPosts();
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'posts'
              ? 'bg-white text-neutral-950 font-semibold shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Tất Cả Bài Viết &amp; Lịch Đăng ({posts.length})
        </button>

        <button
          onClick={() => setActiveTab('accounts')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
            activeTab === 'accounts'
              ? 'bg-white text-neutral-950 font-semibold shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Kết Nối Tài Khoản MXH ({accounts.length})
        </button>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto">
        {/* TAB 1: BATCH GENERATE & AUTO SCHEDULE */}
        {activeTab === 'batch' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-md p-6">
              <h2 className="text-lg font-semibold text-white mb-2">Nhập Danh Sách Chủ Đề (Topics)</h2>
              <p className="text-xs text-neutral-400 mb-4">
                Nhập danh sách các chủ đề (mỗi dòng 1 chủ đề). AI sẽ tự động sinh bài viết chuyên nghiệp (không dùng emoji) + tự tạo ảnh banner và hẹn giờ đăng theo ngày/giờ bạn chọn.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-medium text-neutral-300 mb-2">Danh sách chủ đề:</label>
                <textarea
                  rows={6}
                  value={batchTopicsText}
                  onChange={(e) => setBatchTopicsText(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500 font-mono"
                  placeholder="5 chiến lược phát triển bản thân cho lập trình viên&#10;Phương pháp quản lý thời gian Pomodoro..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Ngày bắt đầu đăng:</label>
                  <input
                    type="date"
                    value={batchStartDate}
                    onChange={(e) => setBatchStartDate(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-sm text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Tần suất (Số ngày / bài):</label>
                  <input
                    type="number"
                    min={1}
                    value={batchIntervalDays}
                    onChange={(e) => setBatchIntervalDays(parseInt(e.target.value) || 1)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-sm text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Giờ đăng tự động (0-23h):</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={batchPublishHour}
                    onChange={(e) => setBatchPublishHour(parseInt(e.target.value) || 9)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-sm text-neutral-100"
                  />
                </div>
              </div>

              <div className="mb-6 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="startFromToday"
                  checked={batchStartFromToday}
                  onChange={(e) => setBatchStartFromToday(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-950 text-white focus:ring-0"
                />
                <label htmlFor="startFromToday" className="text-xs text-neutral-300 cursor-pointer">
                  Đăng bài đầu tiên ngay hôm nay (Nếu không chọn, bài 1 sẽ bắt đầu vào ngày mai)
                </label>
              </div>

              <button
                onClick={handleBatchGenerate}
                disabled={loadingBatch}
                className="w-full py-3 px-4 bg-white text-neutral-950 font-semibold rounded-md hover:bg-neutral-200 transition-all disabled:opacity-50 text-sm"
              >
                {loadingBatch ? 'Đang AI Sinh Bài, Tạo Ảnh & Đặt Lịch MongoDB...' : 'AI Tạo Nội Dung, Sinh Ảnh & Lên Lịch Đăng Bài'}
              </button>
            </div>

            {/* Side Info */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white mb-3">Quy Trình Tự Động Hóa</h3>
                <ul className="space-y-3 text-xs text-neutral-400">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                    <span>AI nhận danh sách chủ đề và viết bài viết sắc sảo, không chèn emoji rác.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                    <span>Tự động sinh ảnh minh họa AI độ phân giải cao và lưu binary.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                    <span>Lên lịch chính xác theo Ngày &amp; Giờ đã chọn và tự động post lên kênh @hayabusa12121.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-neutral-800 text-neutral-200 flex items-center justify-center font-bold text-xs shrink-0">4</span>
                    <span>Bài đã đăng sẽ tự động chuyển sang tab "Bài Đã Đăng" kèm Media ID.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PUBLISHED POSTS */}
        {activeTab === 'published' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">Danh Sách Bài Đã Đăng Thành Công</h2>
                <p className="text-xs text-neutral-400 mt-1">Các bài viết đã xuất hiện trực tiếp trên trang Threads của bạn</p>
              </div>
              <button
                onClick={fetchPublishedPosts}
                className="px-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 text-neutral-200"
              >
                Cập Nhật Danh Sách
              </button>
            </div>

            {publishedPosts.length === 0 ? (
              <div className="text-center py-12 text-neutral-500 text-sm border border-dashed border-neutral-800 rounded-md">
                Chưa có bài viết nào được đăng. Hãy tạo bài và bấm "Đăng ngay" hoặc đợi lịch tự động!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {publishedPosts.map((post) => (
                  <div key={post._id} className="bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden flex flex-col justify-between">
                    <div>
                      {post.imageUrl && (
                        <div className="aspect-square bg-neutral-900 overflow-hidden">
                          <img src={post.imageUrl} alt="AI Banner" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-md">
                            PUBLISHED
                          </span>
                          <span className="text-xs text-neutral-500 font-mono">
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleString('vi-VN') : new Date(post.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-200 whitespace-pre-line line-clamp-6 leading-relaxed">
                          {post.content}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 border-t border-neutral-900 bg-neutral-900/40 flex items-center justify-between text-xs font-mono text-neutral-400">
                      <span className="truncate max-w-[180px]">ID: {post.threadsPublishedPostId || post.platformPostId || post._id}</span>
                      <a
                        href="https://www.threads.net/@hayabusa12121"
                        target="_blank"
                        rel="noreferrer"
                        className="text-neutral-300 hover:text-white underline"
                      >
                        Xem trên Threads ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ALL POSTS & SCHEDULE */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Posts List & Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Create Manual Post Bar */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Tạo Bài Viết Mới &amp; Hẹn Ngày Đăng Thủ Công</h2>
                  <button
                    onClick={() => setShowCreateManual(!showCreateManual)}
                    className="px-3 py-1.5 text-xs bg-white text-neutral-950 font-semibold rounded-md hover:bg-neutral-200"
                  >
                    {showCreateManual ? 'Ẩn Form' : '+ Tạo Bài Mới'}
                  </button>
                </div>

                {showCreateManual && (
                  <div className="mt-4 border-t border-neutral-800 pt-4 space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">Nội dung bài viết:</label>
                      <textarea
                        rows={4}
                        value={manualContent}
                        onChange={(e) => setManualContent(e.target.value)}
                        placeholder="Nhập nội dung bài viết Threads không dùng emoji..."
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-3 text-xs text-neutral-100 focus:outline-none focus:border-neutral-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">Link Ảnh (Tùy chọn):</label>
                        <input
                          type="text"
                          value={manualImageUrl}
                          onChange={(e) => setManualImageUrl(e.target.value)}
                          placeholder="https://image.pollinations.ai/prompt/..."
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-xs text-neutral-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-neutral-300 mb-1">Hẹn Ngày &amp; Giờ Đăng:</label>
                        <input
                          type="datetime-local"
                          value={manualScheduledAt}
                          onChange={(e) => setManualScheduledAt(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-xs text-neutral-100 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => handleCreateManualPost(false)}
                        className="px-4 py-2 bg-neutral-800 text-neutral-200 text-xs font-medium rounded-md hover:bg-neutral-700"
                      >
                        Lưu &amp; Hẹn Ngày Đăng
                      </button>
                      <button
                        onClick={() => handleCreateManualPost(true)}
                        className="px-4 py-2 bg-white text-neutral-950 text-xs font-semibold rounded-md hover:bg-neutral-200"
                      >
                        Đăng Bài Ngay Bây Giờ
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* All Posts List */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Tất Cả Bài Viết ({posts.length})</h2>
                  <button
                    onClick={fetchPosts}
                    className="px-3 py-1.5 text-xs bg-neutral-800 border border-neutral-700 rounded-md hover:bg-neutral-700 text-neutral-200"
                  >
                    Tải lại
                  </button>
                </div>

                {posts.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-sm border border-dashed border-neutral-800 rounded-md">
                    Chưa có bài viết trong cơ sở dữ liệu.
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
                    {posts.map((post) => (
                      <div
                        key={post._id}
                        onClick={() => {
                          setSelectedPost(post);
                          setPreviewContent(post.content);
                          setPreviewImageUrl(post.imageUrl || '');
                        }}
                        className={`p-4 rounded-md border transition-all cursor-pointer ${
                          selectedPost?._id === post._id
                            ? 'border-white bg-neutral-850'
                            : 'border-neutral-800 bg-neutral-950 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-md font-mono ${
                              post.status === 'PUBLISHED'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : post.status === 'SCHEDULED'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            }`}
                          >
                            {post.status}
                          </span>

                          <span className="text-xs text-neutral-400 font-mono">
                            {post.scheduledAt
                              ? `Lịch Đăng: ${new Date(post.scheduledAt).toLocaleString('vi-VN')}`
                              : `Tạo lúc: ${new Date(post.createdAt).toLocaleDateString('vi-VN')}`}
                          </span>
                        </div>

                        <p className="text-xs text-neutral-200 line-clamp-3 mb-3 whitespace-pre-line leading-relaxed">
                          {post.content}
                        </p>

                        {/* Schedule Date Editor Inline */}
                        {editingPostScheduleId === post._id ? (
                          <div className="mb-3 p-3 bg-neutral-900 border border-neutral-800 rounded-md flex items-center gap-2">
                            <input
                              type="datetime-local"
                              value={editingScheduleValue}
                              onChange={(e) => setEditingScheduleValue(e.target.value)}
                              className="bg-neutral-950 border border-neutral-800 rounded p-1.5 text-xs text-neutral-100 font-mono flex-1"
                            />
                            <button
                              onClick={() => handleSaveScheduleDate(post._id)}
                              className="px-3 py-1.5 bg-white text-neutral-950 font-semibold text-xs rounded hover:bg-neutral-200"
                            >
                              Lưu Lịch
                            </button>
                            <button
                              onClick={() => setEditingPostScheduleId(null)}
                              className="px-2.5 py-1.5 bg-neutral-800 text-neutral-400 text-xs rounded hover:text-white"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-neutral-800/60 gap-2">
                          <span className="text-xs text-neutral-500 font-mono">
                            {post.imageUrl ? 'Có ảnh đính kèm' : 'Bài viết chữ'}
                          </span>

                          <div className="flex items-center gap-2">
                            {post.status !== 'PUBLISHED' && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingPostScheduleId(post._id);
                                    if (post.scheduledAt) {
                                      const d = new Date(post.scheduledAt);
                                      const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                        .toISOString()
                                        .slice(0, 16);
                                      setEditingScheduleValue(localIso);
                                    } else {
                                      setEditingScheduleValue('');
                                    }
                                  }}
                                  className="px-2.5 py-1 bg-neutral-800 text-neutral-300 hover:text-white text-xs rounded-md border border-neutral-700"
                                >
                                  Đổi Ngày/Giờ Đăng
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePublishNow(post._id);
                                  }}
                                  disabled={loadingPublishId === post._id}
                                  className="px-3 py-1 bg-white text-neutral-950 text-xs font-semibold rounded-md hover:bg-neutral-200 disabled:opacity-50"
                                >
                                  {loadingPublishId === post._id ? 'Đang Đăng...' : 'Đăng Ngay'}
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePost(post._id);
                              }}
                              className="px-2.5 py-1 bg-neutral-800 text-neutral-400 hover:text-red-400 text-xs rounded-md"
                            >
                              Xóa
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Threads Preview */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Xem Trước Giao Diện Threads Live</h3>
              <div className="bg-black border border-neutral-800 rounded-md p-4 max-w-sm mx-auto shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center font-bold text-xs text-white border border-neutral-700">
                      H
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">hayabusa12121</div>
                      <div className="text-[10px] text-neutral-500">Threads Creator</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-neutral-500">Vừa xong</span>
                </div>

                <p className="text-xs text-neutral-100 whitespace-pre-line mb-3 leading-relaxed">
                  {previewContent || 'Chọn một bài viết bên trái để xem trước giao diện trực tiếp...'}
                </p>

                {previewImageUrl && (
                  <div className="rounded-md overflow-hidden mb-3 border border-neutral-800 aspect-square bg-neutral-900">
                    <img src={previewImageUrl} alt="Threads Media" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-900 font-mono">
                  <span>0 lượt thích</span>
                  <span>0 bình luận</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CONNECT ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-md p-6 max-w-3xl mx-auto">
            <h2 className="text-lg font-semibold text-white mb-2">Tài Khoản Threads Đã Kết Nối</h2>
            <p className="text-xs text-neutral-400 mb-6">
              Hệ thống tự động sử dụng Session Credentials từ file .env hoặc nhập thủ công bên dưới.
            </p>

            <div className="space-y-4 mb-8">
              {accounts.length === 0 ? (
                <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-neutral-400 text-center">
                  Đang khởi tạo tài khoản @hayabusa12121 từ .env...
                </div>
              ) : (
                accounts.map((acc) => (
                  <div key={acc._id} className="p-4 bg-neutral-950 border border-neutral-800 rounded-md flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{acc.accountName}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono">
                          ACTIVE
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono mt-1">User ID: {acc.accountId}</div>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">
                      Token: {acc.accessToken ? `${acc.accessToken.slice(0, 15)}...` : 'N/A'}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Manual Token Form */}
            <form onSubmit={handleManualConnect} className="border-t border-neutral-800 pt-6">
              <h3 className="text-sm font-semibold text-white mb-4">Cập Nhật Token Threads Thủ Công (Nếu cần)</h3>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Tên tài khoản (Ví dụ: @hayabusa12121)"
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-xs text-neutral-100"
                />
                <input
                  type="text"
                  placeholder="Threads User ID (Ví dụ: 70469141102)"
                  value={accId}
                  onChange={(e) => setAccId(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-xs text-neutral-100"
                />
                <textarea
                  rows={3}
                  placeholder="Threads Access Token / Bearer Token IGT..."
                  value={accToken}
                  onChange={(e) => setAccToken(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-md p-2.5 text-xs text-neutral-100 font-mono"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-4 bg-white text-neutral-950 font-semibold text-xs rounded-md hover:bg-neutral-200 transition-all"
              >
                Lưu &amp; Cập Nhật Token
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
