'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import type { PanInfo, Transition } from 'framer-motion';
import { Menu, X, Radar } from 'lucide-react';
import { navItems } from '@/config/nav';
import { springSettle, springMomentum, useAppleMotion } from '@/lib/motion';

const DRAWER_WIDTH_FALLBACK = 300; // used only before the drawer has mounted once

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { reduceMotion } = useAppleMotion();
  const x = useMotionValue(0);
  const drawerRef = useRef<HTMLDivElement>(null);
  const drawerWidthRef = useRef(DRAWER_WIDTH_FALLBACK);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    x.set(0);
    if (open && drawerRef.current) {
      drawerWidthRef.current = drawerRef.current.offsetWidth;
    }
  }, [open, x]);

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const drawerWidth = drawerWidthRef.current;
    const shouldClose = info.offset.x < -drawerWidth * 0.3 || info.velocity.x < -500;
    if (shouldClose) {
      setOpen(false);
    } else {
      const settleTransition: Transition = reduceMotion
        ? { duration: 0.15 }
        : { ...springSettle, velocity: info.velocity.x };
      animate(x, 0, settleTransition);
    }
  }

  return (
    <>
      <div className="mobile-topbar">
        <button className="mobile-topbar-button" onClick={() => setOpen(true)} aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Radar size={18} className="text-radar-accent" />
          <span className="text-sm font-bold text-white">Job Radar</span>
        </div>
        <div className="w-9" />
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="mobile-drawer-scrim"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reduceMotion ? { duration: 0.15 } : springSettle}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              className="mobile-drawer"
              style={{ x }}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={reduceMotion ? { duration: 0.15 } : springSettle}
              drag={reduceMotion ? false : 'x'}
              dragConstraints={{ left: -drawerWidthRef.current, right: 0 }}
              dragElastic={{ left: 0.15, right: 0 }}
              onDragEnd={handleDragEnd}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Radar size={18} className="text-radar-accent" />
                  <span className="text-sm font-bold text-white">Job Radar</span>
                </div>
                <button className="mobile-topbar-button" onClick={() => setOpen(false)} aria-label="Close navigation">
                  <X size={18} />
                </button>
              </div>
              <nav className="flex-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                  return (
                    <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
                      <Icon size={18} />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
