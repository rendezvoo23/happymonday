import { useDrawerStore } from '@/stores/drawer-store';
import { AnimatePresence, motion } from 'framer-motion';
import { Drawer as VaulDrawer } from 'vaul';

interface DrawerProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  shouldScaleBackground?: boolean;
  snapPoints?: (string | number)[];
}

export function Drawer({
  id,
  isOpen,
  onClose,
  children,
  title,
  shouldScaleBackground = false,
  snapPoints,
}: DrawerProps) {
  const { getDrawerLevel, getMaxLevel } = useDrawerStore();
  const level = getDrawerLevel(id);
  const maxLevel = getMaxLevel();
  
  // Calculate z-index based on level
  const baseZIndex = 100;
  const overlayZIndex = baseZIndex + level * 10;
  const contentZIndex = overlayZIndex + 1;
  
  // Calculate opacity for overlay based on level
  const overlayOpacity = level === 0 ? 0.4 : 0.2;
  
  return (
    <VaulDrawer.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      shouldScaleBackground={shouldScaleBackground && level === maxLevel}
      snapPoints={snapPoints}
    >
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay
          className="fixed inset-0 bg-black"
          style={{
            zIndex: overlayZIndex,
            opacity: overlayOpacity,
          }}
        />
        <VaulDrawer.Content
          className="bg-white dark:bg-gray-900 flex flex-col fixed bottom-0 left-0 right-0 max-h-[calc(100vh-100px)] rounded-t-[24px] shadow-2xl focus:outline-none"
          style={{
            zIndex: contentZIndex,
            transform: `translateY(${level * 8}px)`,
          }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" />
          </div>
          
          {/* Title */}
          {title && (
            <div className="px-4 pb-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            </div>
          )}
          
          {/* Content - Prevent dragging on content area */}
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            data-vaul-no-drag
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`drawer-${id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="px-4 pb-16"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}

// Drawer Manager Component - renders all active drawers
export function DrawerManager() {
  const { drawers, closeDrawer } = useDrawerStore();
  
  return (
    <>
      {drawers.map((drawer) => {
        const Component = drawer.component;
        return (
          <Drawer
            key={drawer.id}
            id={drawer.id}
            isOpen={true}
            onClose={() => closeDrawer(drawer.id)}
          >
            <Component {...drawer.props} onClose={() => closeDrawer(drawer.id)} />
          </Drawer>
        );
      })}
    </>
  );
}

// Hook to manage drawer state
export function useDrawer() {
  const { openDrawer, closeDrawer, closeAllDrawers, isDrawerOpen } = useDrawerStore();
  
  return {
    openDrawer,
    closeDrawer,
    closeAllDrawers,
    isDrawerOpen,
  };
}
