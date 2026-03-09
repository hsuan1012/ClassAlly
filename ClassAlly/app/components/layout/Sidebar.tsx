'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, BookOpen, Gamepad2, Play, BarChart3,
  Settings, LogOut, ChevronLeft, Globe, CreditCard, Check,
  Calendar, MessageSquare, Bell, Wand2, PanelLeft, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { useLanguage, type Language } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/utils/translations';

// --- Styles Injection (全域 Neo 風格注入) ---
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .neo-nav-item {
      border: 3px solid transparent;
      transition: all 0.1s ease;
      font-weight: 900 !important;
      margin-bottom: 8px;
    }
    .neo-nav-item-active {
      background-color: #fde047 !important; /* Yellow-300 */
      border: 3px solid #000 !important;
      box-shadow: 4px 4px 0px 0px #000 !important;
      color: #000 !important;
      transform: translate(-2px, -2px);
    }
    .neo-nav-item:hover:not(.neo-nav-item-active) {
      background-color: #f3f4f6 !important;
      border: 3px solid #000 !important;
      box-shadow: 2px 2px 0px 0px #000 !important;
      transform: translate(-1px, -1px);
    }
    .neo-sidebar-container {
      border-right: 4px solid #000 !important;
    }
    .neo-user-card {
      border: 3px solid #000 !important;
      box-shadow: 4px 4px 0px 0px #000 !important;
      background: #fff;
      border-radius: 12px;
      transition: all 0.2s;
    }
    .neo-user-card:hover {
      box-shadow: 6px 6px 0px 0px #000 !important;
      transform: translate(-1px, -1px);
    }
    /* 讓 Dropdown 彈出視窗也符合 Neo 風格 */
    [data-radix-menu-content] {
      border: 3px solid #000 !important;
      box-shadow: 6px 6px 0px 0px #000 !important;
      background: white !important;
    }
  `;
  document.head.appendChild(style);
}

interface SidebarProps {
  className?: string;
  onCollapseChange?: (collapsed: boolean) => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Sidebar({ 
  className, 
  onCollapseChange,
  isOpen = false,
  onOpenChange
}: SidebarProps) {
  const [user, setUser] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation(language);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (className) {
      const isNarrow = className.includes('w-[80px]') || className.includes('w-[70px]');
      if (isCollapsed !== isNarrow) setIsCollapsed(isNarrow);
    }
  }, [className, isCollapsed]);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { supabase } = await import('../../../lib/supabase');
        const { data: { user } } = await supabase().auth.getUser();
        setUser(user);
      } catch (error) { console.error("Error fetching user:", error); }
    };
    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      const { supabase } = await import('../../../lib/supabase');
      const supabaseClient = supabase();
      
      // ✅ 修正：加上 .auth 呼叫
      const { error } = await supabaseClient.auth.signOut();
      
      if (error) throw error;

      toast({ 
        title: t('signed_out_successfully'),
        className: "neo-card border-l-[12px] border-l-green-400"
      });

      window.location.href = '/login';
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({ 
        title: t('error_signing_out'), 
        variant: 'destructive',
        className: "neo-card border-l-[12px] border-l-red-500"
      });
    }
  };

  const handleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    if (onCollapseChange) onCollapseChange(next);
  };

  const changeLanguage = (value: Language) => {
    setLanguage(value);
    toast({ title: value === 'en' ? 'Language changed' : '語言已更改' });
  };

  const navigation = [
    { name: t('students'), href: '/students', icon: Users },
    { name: t('reports'), href: '/reports', icon: BarChart3 },
    { name: t('lessons'), href: '/lessons', icon: BookOpen },
  ];

  return (
    <>
      <aside 
        className={cn(
          'fixed inset-y-0 left-0 z-30 bg-white transition-all duration-300 ease-in-out h-screen neo-sidebar-container',
          isCollapsed ? 'w-[85px]' : 'w-72',
          { 'hidden md:block': isMobile && !isCollapsed && !isOpen, 'block': isMobile && isOpen },
          className
        )}
      >
        {/* Header - Logo Area */}
        <div className="flex h-20 items-center justify-between px-4 border-b-4 border-black bg-purple-50">
          {!isCollapsed ? (
            <div className="flex items-center justify-between w-full">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                 <Wand2 className="h-7 w-7 text-purple-600 transform -rotate-12 group-hover:rotate-0 transition-transform stroke-[3px]" />
                 <span className="text-2xl font-black uppercase tracking-tighter text-black">ClassAlly</span>
              </Link>
              <button 
                onClick={handleCollapse} 
                className="p-2 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_#000] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
              >
                <ChevronLeft className="h-5 w-5 text-black" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center w-full">
              <button 
                onClick={handleCollapse} 
                className="p-2 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_#000]"
              >
                <PanelLeft className="h-6 w-6 text-black" />
              </button>
            </div>
          )}
        </div>

        {/* Navigation List */}
        <ScrollArea className="flex-1 h-[calc(100vh-12rem)] py-6 scrollbar-hide">
          <nav className="space-y-2 px-4 pt-4">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => isMobile && onOpenChange?.(false)}
                  className={cn(
                    'flex items-center px-4 py-3 rounded-xl text-sm font-black transition-all neo-nav-item',
                    isActive ? 'neo-nav-item-active' : 'text-gray-600',
                    isCollapsed && 'justify-center px-0'
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn('h-6 w-6 shrink-0 stroke-[3px]', isCollapsed ? 'mr-0' : 'mr-3')} />
                  {!isCollapsed && <span className="truncate uppercase tracking-tight">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        {/* Footer - User Profile Card */}
        <div className="p-4 border-t-4 border-black bg-gray-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className={cn(
                "flex items-center w-full p-2 neo-user-card overflow-hidden",
                isCollapsed ? "justify-center" : "px-3 justify-start"
              )}>
                <Avatar className="h-10 w-10 border-2 border-black shadow-[2px_2px_0px_0px_#000] shrink-0">
                  {user?.user_metadata?.avatar_url || user?.user_metadata?.picture ? (
                    <AvatarImage src={user.user_metadata.avatar_url || user.user_metadata.picture} />
                  ) : (
                    <AvatarFallback className="bg-yellow-300 text-black font-black">
                      {user?.email?.charAt(0).toUpperCase() || 'M'}
                    </AvatarFallback>
                  )}
                </Avatar>
                
                {!isCollapsed && (
                  <div className="ml-3 flex flex-col text-left overflow-hidden">
                    <span className="font-black text-black text-sm truncate uppercase leading-tight">
                      {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Magician'}
                    </span>
                    <span className="text-[10px] font-black text-purple-700 bg-purple-100 border border-black px-1.5 rounded-sm w-fit mt-1">
                      {user?.user_metadata?.subscription_plan || t('free_plan')}
                    </span>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            
            <DropdownMenuContent className="w-64 p-2" align="start" side="right" sideOffset={20}>
              
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="font-bold focus:bg-purple-100 cursor-pointer">
                  <Settings className="mr-3 h-5 w-5" /> <span>{t('settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="font-bold focus:bg-purple-100">
                    <Globe className="mr-3 h-5 w-5" /> <span>{t('language')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="ml-2">
                    <DropdownMenuRadioGroup value={language} onValueChange={(v) => changeLanguage(v as Language)}>
                      <DropdownMenuRadioItem value="en" className="font-bold">ENGLISH</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="zh-TW" className="font-bold">繁體中文</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onClick={() => router.push('/subscription')} className="font-bold focus:bg-purple-100 cursor-pointer">
                  <CreditCard className="mr-3 h-5 w-5" /> <span>{t('subscription')}</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator className="bg-black h-[2px] my-2" />
              <DropdownMenuItem onClick={handleSignOut} className="font-black text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer">
                <LogOut className="mr-3 h-5 w-5" /> <span>{t('log_out')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div className="fixed inset-0 z-20 bg-black/70 backdrop-blur-md md:hidden" onClick={() => onOpenChange?.(false)} />
      )}
    </>
  );
}