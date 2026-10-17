import Swal from 'sweetalert2';

/**
 * Premium Notification Utility using SweetAlert2
 */
export const showToast = (message, icon = 'success') => {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

    Toast.fire({
        icon: icon,
        title: message
    });
};

export const confirmAction = async (title, text, confirmButtonText = 'Yes, proceed', icon = 'warning') => {
    const result = await Swal.fire({
        title: title,
        text: text,
        icon: icon,
        showCancelButton: true,
        confirmButtonColor: '#e11d48', // rose-600
        cancelButtonColor: '#94a3b8', // slate-400
        confirmButtonText: confirmButtonText,
        cancelButtonText: 'Cancel',
        reverseButtons: true,
        background: '#ffffff',
        customClass: {
            title: 'text-xl font-bold text-slate-900',
            htmlContainer: 'text-slate-600',
            confirmButton: 'px-6 py-2.5 rounded-xl font-bold transition-all transform hover:scale-105',
            cancelButton: 'px-6 py-2.5 rounded-xl font-bold transition-all'
        }
    });

    return result.isConfirmed;
};

export const showAlert = (title, text, icon = 'info') => {
    return Swal.fire({
        title,
        text,
        icon,
        confirmButtonColor: '#e11d48', // rose-600
        customClass: {
            title: 'text-xl font-bold text-slate-900',
            htmlContainer: 'text-slate-600',
            confirmButton: 'px-8 py-3 rounded-xl font-bold'
        }
    });
};

export const showLoading = (title = 'Processing...', text = 'Please wait') => {
    Swal.fire({
        title,
        text,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
};

export const closeLoading = () => {
    Swal.close();
};
