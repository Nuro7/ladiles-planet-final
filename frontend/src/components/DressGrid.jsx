import { useState } from 'react';
import DressCard from './DressCard';
import DressEditModal from './DressEditModal';

export default function DressGrid({ dresses, onUpdate }) {
    const [selectedDress, setSelectedDress] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const handleEdit = (dress) => { setSelectedDress(dress); setShowEditModal(true); };
    const handleEditSuccess = () => { setShowEditModal(false); setSelectedDress(null); onUpdate?.(); };

    return (
        <>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 16,
            }}>
                {dresses.map((dress, i) => (
                    <div
                        key={dress.id}
                        className="animate-fade-up"
                        style={{ animationDelay: `${i * 0.04}s` }}
                    >
                        <DressCard dress={dress} onEdit={handleEdit} onUpdate={onUpdate} />
                    </div>
                ))}
            </div>

            {showEditModal && selectedDress && (
                <DressEditModal
                    dress={selectedDress}
                    onClose={() => setShowEditModal(false)}
                    onSuccess={handleEditSuccess}
                />
            )}
        </>
    );
}
