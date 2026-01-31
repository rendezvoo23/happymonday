import { PageShell } from '@/components/layout/PageShell';
import { SettingsDrawer } from '@/components/layout/SettingsDrawer';
import { useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';

export function SettingsPage() {
  const navigate = useNavigate();

  const handleClose = () => {
    navigate({ to: '/home' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <PageShell>
        <SettingsDrawer isOpen={true} onClose={handleClose} />
      </PageShell>
    </motion.div>
  );
}
