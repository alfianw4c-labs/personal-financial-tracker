import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Memastikan klik pada area field tanggal atau waktu mana pun langsung membuka native datepicker
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  
  if (target.tagName === 'INPUT') {
    const input = target as HTMLInputElement;
    if (input.type === 'date' || input.type === 'time') {
      try {
        input.showPicker?.();
      } catch {}
    }
  } else {
    // Jika mengklik label atau container pembungkus yang memiliki input date/time
    const parentContainer = target.closest('label, div');
    const childInput = parentContainer?.querySelector('input[type="date"], input[type="time"]') as HTMLInputElement | null;
    if (childInput && target !== childInput) {
      try {
        childInput.showPicker?.();
      } catch {}
    }
  }
});

createRoot(document.getElementById('root')!).render(<App />);
