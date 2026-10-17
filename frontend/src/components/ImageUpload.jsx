import React, { useRef } from 'react';
import { Upload, X, CheckCircle2 } from 'lucide-react';

const ImageUpload = ({ image, setImage, label }) => {
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert('File size must be less than 10MB');
                return;
            }
            if (!file.type.startsWith('image/')) {
                alert('Please upload an image file');
                return;
            }
            setImage(file);
        }
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {!image ? (
                <div
                    onClick={() => fileInputRef.current?.click()}
                    className="upload-zone"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        background: '#050505',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '8px',
                        padding: '24px 12px',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#FFF'; e.currentTarget.style.background = '#111'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = '#050505'; }}
                >
                    <Upload size={24} color="#FFF" style={{ opacity: 0.8 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ color: '#FFF', fontSize: '13px', fontWeight: 500, letterSpacing: '0.04em' }}>{label}</span>
                        <span style={{ color: '#888', fontSize: '11px' }}>PNG, JPG up to 10MB</span>
                    </div>
                    <span style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: '#FFF',
                        background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.25)',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        Choose File
                    </span>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                    />
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #FFF',
                    borderRadius: '8px',
                    background: '#0A0A0A'
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: '#111'
                    }}>
                        <img
                            src={typeof image === 'string' ? image : URL.createObjectURL(image)}
                            alt="Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CheckCircle2 size={14} color="#00FF66" />
                            <p style={{ 
                                fontWeight: 500, 
                                fontSize: '12px', 
                                color: '#FFF',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {typeof image === 'string' ? 'Saved Image' : image.name}
                            </p>
                        </div>
                        <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                            {typeof image === 'string' ? 'Saved Bride' : `${(image.size / 1024 / 1024).toFixed(2)} MB`}
                        </p>
                    </div>
                    <button
                        onClick={handleRemove}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ImageUpload;
