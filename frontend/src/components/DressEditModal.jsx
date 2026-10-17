import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const DRESS_CATEGORIES = [
    'Bridal Gown',
    'Evening Gown',
    'Cocktail Dress',
    'Traditional',
    'Contemporary',
    'Lehenga',
    'Saree',
    'Anarkali',
    'Other'
];

export default function DressEditModal({ dress, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: dress.name || '',
        description: dress.description || '',
        category: dress.category || '',
        sku: dress.sku || '',
        isAvailable: dress.is_available
    });
    const [newImage, setNewImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details'); // 'details' or 'image'

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            if (file.size > 10 * 1024 * 1024) {
                setError('Image size must be less than 10MB');
                return;
            }

            setNewImage(file);
            setError(null);

            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdateDetails = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            setUpdating(true);

            const response = await fetch(`${API_BASE_URL}/dresses/${dress.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setError(data.error || 'Failed to update dress');
            }
        } catch (error) {
            console.error('Update error:', error);
            setError('Failed to update dress. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    const handleUpdateImage = async (e) => {
        e.preventDefault();
        setError(null);

        if (!newImage) {
            setError('Please select a new image');
            return;
        }

        try {
            setUpdating(true);

            const formDataToSend = new FormData();
            formDataToSend.append('image', newImage);

            const response = await fetch(`${API_BASE_URL}/dresses/${dress.id}/image`, {
                method: 'PUT',
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success) {
                if (onSuccess) {
                    onSuccess();
                }
            } else {
                setError(data.error || 'Failed to update image');
            }
        } catch (error) {
            console.error('Image update error:', error);
            setError('Failed to update image. Please try again.');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <h2 className="text-2xl font-bold text-slate-900">Edit Dress</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'details'
                            ? 'text-rose-600 border-b-2 border-rose-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab('image')}
                        className={`flex-1 px-6 py-4 font-semibold transition-colors ${activeTab === 'image'
                            ? 'text-rose-600 border-b-2 border-rose-600'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Update Image
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="m-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <p className="text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {/* Details Tab */}
                {activeTab === 'details' && (
                    <form onSubmit={handleUpdateDetails} className="p-6 space-y-6">
                        {/* Current Image Preview */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                                Current Image
                            </label>
                            <img
                                src={dress.image_url}
                                alt={dress.name}
                                className="w-full max-w-xs rounded-lg"
                            />
                        </div>

                        {/* Name */}
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-3">
                                Dress Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="input-premium"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-3">
                                Category *
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleInputChange}
                                className="input-premium"
                                required
                            >
                                <option value="">Select a category</option>
                                {DRESS_CATEGORIES.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-3">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                rows={4}
                                className="input-premium resize-none"
                            />
                        </div>

                        {/* SKU */}
                        <div>
                            <label htmlFor="sku" className="block text-sm font-semibold text-slate-700 mb-3">
                                SKU
                            </label>
                            <input
                                type="text"
                                id="sku"
                                name="sku"
                                value={formData.sku}
                                onChange={handleInputChange}
                                className="input-premium"
                            />
                        </div>

                        {/* Availability */}
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="isAvailable"
                                name="isAvailable"
                                checked={formData.isAvailable}
                                onChange={handleInputChange}
                                className="w-5 h-5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                            />
                            <label htmlFor="isAvailable" className="text-sm font-semibold text-slate-700">
                                Mark as available for selection
                            </label>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-premium btn-outline flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updating}
                                className="btn-premium btn-primary flex-1"
                            >
                                {updating ? 'Updating...' : 'Update Details'}
                            </button>
                        </div>
                    </form>
                )}

                {/* Image Tab */}
                {activeTab === 'image' && (
                    <form onSubmit={handleUpdateImage} className="p-6 space-y-6">
                        {/* Current Image */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                                Current Image
                            </label>
                            <img
                                src={dress.image_url}
                                alt={dress.name}
                                className="w-full max-w-xs rounded-lg"
                            />
                        </div>

                        {/* New Image Upload */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                                New Image
                            </label>
                            <div
                                className={`upload-zone ${imagePreview ? 'upload-zone-active' : ''}`}
                                onClick={() => document.getElementById('new-dress-image').click()}
                            >
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="New preview"
                                            className="max-h-64 mx-auto rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setNewImage(null);
                                                setImagePreview(null);
                                            }}
                                            className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg hover:bg-red-50"
                                        >
                                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="text-slate-600 font-medium mb-2">Click to select new image</p>
                                        <p className="text-sm text-slate-500">PNG, JPG, WEBP up to 10MB</p>
                                    </div>
                                )}
                            </div>
                            <input
                                id="new-dress-image"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-premium btn-outline flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updating || !newImage}
                                className="btn-premium btn-primary flex-1"
                            >
                                {updating ? 'Updating...' : 'Update Image'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
