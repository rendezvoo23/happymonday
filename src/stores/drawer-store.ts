import { create } from 'zustand';

export interface DrawerState {
  id: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  level: number;
}

interface DrawerStore {
  drawers: DrawerState[];
  openDrawer: (id: string, component: React.ComponentType<any>, props?: Record<string, any>) => void;
  closeDrawer: (id: string) => void;
  closeAllDrawers: () => void;
  closeTopDrawer: () => void;
  isDrawerOpen: (id: string) => boolean;
  getDrawerLevel: (id: string) => number;
  getMaxLevel: () => number;
}

export const useDrawerStore = create<DrawerStore>((set, get) => ({
  drawers: [],
  
  openDrawer: (id, component, props) => {
    set((state) => {
      // Check if drawer already exists
      const existingIndex = state.drawers.findIndex((d) => d.id === id);
      
      if (existingIndex !== -1) {
        // Update existing drawer
        const updatedDrawers = [...state.drawers];
        updatedDrawers[existingIndex] = {
          ...updatedDrawers[existingIndex],
          component,
          props,
        };
        return { drawers: updatedDrawers };
      }
      
      // Add new drawer on top
      const maxLevel = state.drawers.length > 0 
        ? Math.max(...state.drawers.map((d) => d.level))
        : -1;
      
      return {
        drawers: [
          ...state.drawers,
          {
            id,
            component,
            props,
            level: maxLevel + 1,
          },
        ],
      };
    });
  },
  
  closeDrawer: (id) => {
    set((state) => {
      const drawerIndex = state.drawers.findIndex((d) => d.id === id);
      
      if (drawerIndex === -1) return state;
      
      // Remove the drawer and all drawers above it
      const updatedDrawers = state.drawers.filter((_, index) => index < drawerIndex);
      
      return { drawers: updatedDrawers };
    });
  },
  
  closeAllDrawers: () => {
    set({ drawers: [] });
  },
  
  closeTopDrawer: () => {
    set((state) => {
      if (state.drawers.length === 0) return state;
      return { drawers: state.drawers.slice(0, -1) };
    });
  },
  
  isDrawerOpen: (id) => {
    return get().drawers.some((d) => d.id === id);
  },
  
  getDrawerLevel: (id) => {
    const drawer = get().drawers.find((d) => d.id === id);
    return drawer?.level ?? -1;
  },
  
  getMaxLevel: () => {
    const drawers = get().drawers;
    return drawers.length > 0 
      ? Math.max(...drawers.map((d) => d.level))
      : -1;
  },
}));
