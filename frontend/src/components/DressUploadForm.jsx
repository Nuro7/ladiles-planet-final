import { useState } from 'react';
import { fetchWithAuth } from '../utils/api';
import { showToast } from '../utils/notifications';

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

export default function DressUploadForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        sku: '',
        isAvailable: true
    });
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

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
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select a valid image file');
                return;
            }

            // Validate file size (10MB)
            if (file.size > 10 * 1024 * 1024) {
                setError('Image size must be less than 10MB');
                return;
            }

            setImageFile(file);
            setError(null);

            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.name || !formData.category) {
            setError('Please fill in all required fields');
            return;
        }

        if (!imageFile) {
            setError('Please select a dress image');
            return;
        }

        try {
            setUploading(true);

            const formDataToSend = new FormData();
            formDataToSend.append('image', imageFile);
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('category', formData.category);
            formDataToSend.append('isAvailable', formData.isAvailable);

            if (formData.sku) {
                formDataToSend.append('sku', formData.sku);
            }

            const response = await fetchWithAuth(`${API_BASE_URL}/dresses/upload`, {
                method: 'POST',
                body: formDataToSend
            });

            const data = await response.json();

            if (data.success) {
                // Reset form
                setFormData({
                    name: '',
                    description: '',
                    category: '',
                    sku: '',
                    isAvailable: true
                });
                setImageFile(null);
                setImagePreview(null);

                // Call success callback
                if (onSuccess) {
                    showToast('Dress uploaded successfully to catalog! 👗');
                    onSuccess(data.data);
                }
            } else {
                setError(data.error || 'Failed to upload dress');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setError('Failed to upload dress. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="glass-card p-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Upload New Dress</h2>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                    <p className="text-red-700 font-medium">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Image Upload */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">
                        Dress Image *
                    </label>
                    <div className="flex gap-6">
                        <div className="flex-1">
                            <div
                                className={`upload-zone ${imagePreview ? 'upload-zone-active' : ''}`}
                                onClick={() => document.getElementById('dress-image-input').click()}
                            >
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="max-h-64 mx-auto rounded-lg"
                                        />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setImageFile(null);
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
                                        <p className="text-slate-600 font-medium mb-2">Click to upload dress image</p>
                                        <p className="text-sm text-slate-500">PNG, JPG, WEBP up to 10MB</p>
                                    </div>
                                )}
                            </div>
                            <input
                                id="dress-image-input"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                {/* Dress Name */}
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
                        placeholder="e.g., Royal Elegance Bridal Gown"
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
                        placeholder="Describe the dress details, fabric, embellishments, etc."
                        rows={4}
                        className="input-premium resize-none"
                    />
                </div>

                {/* SKU (Optional) */}
                <div>
                    <label htmlFor="sku" className="block text-sm font-semibold text-slate-700 mb-3">
                        SKU (Optional)
                    </label>
                    <input
                        type="text"
                        id="sku"
                        name="sku"
                        value={formData.sku}
                        onChange={handleInputChange}
                        placeholder="Leave blank to auto-generate"
                        className="input-premium"
                    />
                    <p className="text-sm text-slate-500 mt-2">
                        If left blank, a unique SKU will be generated automatically
                    </p>
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
                        type="submit"
                        disabled={uploading}
                        className="btn-premium btn-primary flex-1"
                    >
                        {uploading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Uploading...
                            </span>
                        ) : (
                            'Upload Dress'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
