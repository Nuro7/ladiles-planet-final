import React, { useState, useRef } from 'react';
import { Upload, X, Check, User, Camera, Plus } from 'lucide-react';
import { fetchWithAuth } from '../utils/api';
import { showToast, showAlert } from '../utils/notifications';

const ANGLE_OPTIONS = [
    { value: 'front', label: 'Front' },
    { value: 'left', label: 'Left' },
    { value: 'right', label: 'Right' },
    { value: 'back', label: 'Back' },
    { value: 'unknown', label: 'Other' }
];

const detectAngle = (filename = '') => {
    const f = filename.toLowerCase();
    if (f.includes('front')) return 'front';
    if (f.includes('left')) return 'left';
    if (f.includes('right')) return 'right';
    if (f.includes('back')) return 'back';
    return 'unknown';
};

const MAX_IMAGES = 10;

const BrideUploadForm = ({ onSuccess }) => {
    const [brideName, setBrideName] = useState('');
    const [status, setStatus] = useState('draft');
    // items: [{ id, file, preview, angle }]
    const [items, setItems] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const addFiles = (fileList) => {
        const incoming = Array.from(fileList || []);
        if (incoming.length === 0) return;

        const room = MAX_IMAGES - items.length;
        if (room <= 0) {
            showToast(`Maximum ${MAX_IMAGES} images allowed`, 'error');
            return;
        }

        const accepted = [];
        for (const file of incoming.slice(0, room)) {
            if (!file.type.startsWith('image/')) {
                showToast(`Skipped "${file.name}" — not an image`, 'error');
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                showToast(`Skipped "${file.name}" — over 10MB`, 'error');
                continue;
            }
            accepted.push(file);
        }

        if (accepted.length === 0) return;

        Promise.all(
            accepted.map(
                (file) =>
                    new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve({
                                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                file,
                                preview: reader.result,
                                angle: detectAngle(file.name)
                            });
                        };
                        reader.readAsDataURL(file);
                    })
            )
        ).then((newItems) => setItems((prev) => [...prev, ...newItems]));

        if (incoming.length > room) {
            showToast(`Only ${room} more image(s) accepted (max ${MAX_IMAGES})`, 'info');
        }
    };

    const handleFileInput = (e) => {
        addFiles(e.target.files);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const removeItem = (id) => {
        setItems((prev) => prev.filter((it) => it.id !== id));
    };

    const setItemAngle = (id, angle) => {
        setItems((prev) => prev.map((it) => (it.id === id ? { ...it, angle } : it)));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!brideName.trim()) {
            showToast('Please enter bride name', 'error');
            return;
        }

        if (items.length === 0) {
            showToast('Please add at least one image', 'error');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('name', brideName.trim());
            formData.append('status', status);
            formData.append('imageType', 'identity');

            items.forEach((it) => {
                formData.append('images', it.file);
                formData.append('angles', it.angle);
            });

            setUploadProgress(20);

            const response = await fetchWithAuth('/api/brides/upload', {
                method: 'POST',
                body: formData
            });

            setUploadProgress(60);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to upload bride');
            }

            const result = await response.json();
            console.log('✅ Bride uploaded:', result.data);

            setUploadProgress(100);
            showToast(
                `Bride "${brideName}" uploaded with ${result.data.images.length} image(s) ✨`,
                'success'
            );

            setBrideName('');
            setStatus('draft');
            setItems([]);

            if (onSuccess) {
                onSuccess(result.data.bride);
            }
        } catch (error) {
            console.error('❌ Upload error:', error);
            showAlert('Upload Failed', error.message, 'error');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="glass-card p-8">
            <div className="section-header mb-8">
                <h3 className="section-title flex items-center gap-3">
                    <User className="w-8 h-8 text-rose-600" />
                    Upload New Bride
                </h3>
                <p className="section-subtitle">
                    Add a bride profile and upload one or more reference photos. You can include
                    all sides (front, left, right, back) for the best AI results.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Bride Name */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Bride Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                        type="text"
                        value={brideName}
                        onChange={(e) => setBrideName(e.target.value)}
                        placeholder="Enter bride's name"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 transition-all outline-none"
                        disabled={isUploading}
                    />
                </div>

                {/* Status */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
                        Status
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 transition-all outline-none"
                        disabled={isUploading}
                    >
                        <option value="draft">Draft</option>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                    </select>
                </div>

                {/* Single multi-file upload zone */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Bride Photos <span className="text-rose-600">*</span>
                        </label>
                        <span className="text-xs text-slate-500">
                            {items.length}/{MAX_IMAGES} added
                        </span>
                    </div>

                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => !isUploading && fileInputRef.current?.click()}
                        className={`rounded-xl border-2 border-dashed transition-all cursor-pointer p-8 text-center ${
                            isDragging
                                ? 'border-rose-500 bg-rose-50'
                                : 'border-slate-300 hover:border-rose-500 hover:bg-rose-50/50 bg-slate-50'
                        }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileInput}
                            className="hidden"
                            disabled={isUploading}
                        />
                        <Camera className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                        <div className="text-base font-bold text-slate-700 mb-1">
                            Click to add photos or drag & drop
                        </div>
                        <div className="text-sm text-slate-500">
                            Add as many sides as you have — front, left, right, back. Up to{' '}
                            {MAX_IMAGES} images, max 10MB each.
                        </div>
                    </div>

                    {/* Preview grid with per-image angle picker */}
                    {items.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                            {items.map((it) => (
                                <div
                                    key={it.id}
                                    className="relative rounded-xl overflow-hidden border-2 border-slate-200 bg-slate-50"
                                >
                                    <div className="aspect-square relative group">
                                        <img
                                            src={it.preview}
                                            alt="bride"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => removeItem(it.id)}
                                                className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                                                disabled={isUploading}
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            Ready
                                        </div>
                                    </div>
                                    <div className="p-2">
                                        <select
                                            value={it.angle}
                                            onChange={(e) =>
                                                setItemAngle(it.id, e.target.value)
                                            }
                                            disabled={isUploading}
                                            className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 bg-white focus:border-rose-500 outline-none"
                                        >
                                            {ANGLE_OPTIONS.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            ))}

                            {items.length < MAX_IMAGES && (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-rose-500 hover:bg-rose-50 transition-all flex flex-col items-center justify-center text-slate-500"
                                >
                                    <Plus className="w-8 h-8 mb-1" />
                                    <span className="text-xs font-semibold">Add more</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Upload Progress */}
                {isUploading && (
                    <div className="animate-fade-in">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">
                                Uploading...
                            </span>
                            <span className="text-sm font-bold text-rose-600">
                                {uploadProgress}%
                            </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-rose-600 to-pink-600 transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={isUploading}
                    className="btn-primary w-full text-lg py-4 flex items-center justify-center gap-3"
                >
                    {isUploading ? (
                        <>
                            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            Uploading Bride...
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            Upload Bride Profile
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default BrideUploadForm;
