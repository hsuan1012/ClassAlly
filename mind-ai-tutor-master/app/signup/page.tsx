'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

// --- Styles Injection (新野獸派風格) ---
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .neo-bg-pattern { background-color: #fcfcfc; background-image: radial-gradient(#000 1px, transparent 1px); background-size: 24px 24px; }
    .neo-card { border: 3px solid #000; background: #fff; box-shadow: 6px 6px 0px 0px #000; border-radius: 8px; }
    .neo-input { border: 2px solid #000; background: #fff; box-shadow: 3px 3px 0px 0px rgba(0,0,0,0.1); transition: all 0.2s; border-radius: 6px; }
    .neo-input:focus, .neo-input:focus-visible { box-shadow: 4px 4px 0px 0px #000 !important; outline: none !important; transform: translate(-1px, -1px); border-color: #000 !important; ring: 0; }
    .neo-btn { border: 2px solid #000; box-shadow: 4px 4px 0px 0px #000; font-weight: 800; transition: all 0.1s; border-radius: 6px; letter-spacing: 0.05em; }
    .neo-btn:hover { transform: translate(-1px, -1px); box-shadow: 5px 5px 0px 0px #000; }
    .neo-btn:active { transform: translate(2px, 2px); box-shadow: 0px 0px 0px 0px #000; }
  `;
  // 避免重複加入 style
  if (!document.getElementById('neo-brutalism-signup-style')) {
    style.id = 'neo-brutalism-signup-style';
    document.head.appendChild(style);
  }
}

export default function SignUpPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [supabase, setSupabase] = useState<any>(null);
  
  useEffect(() => {
    // 在客戶端創建 Supabase 客戶端
    const initializeSupabase = async () => {
      const { supabase } = await import('@/lib/supabase');
      const client = supabase();
      setSupabase(client);
    };
    
    initializeSupabase();
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      console.error('Supabase 用戶端尚未初始化');
      return;
    }
    
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      toast({
        title: '資料不完整',
        description: '請填寫所有必填欄位。',
        variant: 'destructive',
        className: "neo-card border-l-8 border-l-red-500 font-bold text-black",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: '密碼不一致',
        description: '請確保兩次輸入的密碼相同。',
        variant: 'destructive',
        className: "neo-card border-l-8 border-l-red-500 font-bold text-black",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`,
            subscription_plan: 'Free plan'
          }
        }
      });
      
      if (error) {
        throw error;
      }

      if (data?.user?.identities?.length === 0) {
        toast({
          title: '電子郵件已註冊',
          description: '此信箱已經註冊過帳號，請直接登入。',
          variant: 'destructive',
          className: "neo-card border-l-8 border-l-red-500 font-bold text-black",
        });
        router.push('/login');
        return;
      }
      
      // 檢查是否需要電子郵件驗證
      if (data?.user?.confirmed_at) {
        // 電子郵件已驗證，直接前往學生列表頁面
        toast({
          title: '註冊成功',
          description: '歡迎加入 ClassAlly！',
          className: "neo-card border-l-8 border-l-green-400 font-bold",
        });
        router.push('/students'); // 🌟 這裡同步幫你改成 /students
      } else {
        // 需要電子郵件驗證
        toast({
          title: '註冊成功',
          description: '系統將在幾秒後跳轉至登入頁面。',
          duration: 5000,
          className: "neo-card border-l-8 border-l-green-400 font-bold",
        });
        
        // 延遲後跳轉至登入頁面
        setTimeout(() => {
          router.push('/login');
        }, 5000);
      }
      
    } catch (error: any) {
      // 🌟 1. 先把錯誤訊息存到一個變數裡
      let errorMessage = error.message || '無法完成註冊，請稍後再試。';

      // 🌟 2. 攔截 Supabase 特定的英文錯誤，強制翻譯成中文
      if (errorMessage.includes('User already registered')) {
        errorMessage = '此電子郵件已經註冊過帳號，請直接前往登入。';
      } else if (errorMessage.includes('Password should be at least')) {
        errorMessage = '密碼長度太短，請至少輸入 6 個字元。';
      }

      toast({
        title: '註冊失敗',
        description: errorMessage, // 🌟 3. 顯示我們翻譯過後的中文
        className: "neo-card border-l-8 border-l-red-500 font-bold text-black",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center neo-bg-pattern px-4 py-8">
      <div className="text-center mb-8 md:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-block relative">
          <div className="flex items-center justify-center relative gap-4">
            
            {/* 左側魔杖圖示 */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 559" className="h-12 md:h-14 w-auto drop-shadow-[2px_2px_0px_#000]" style={{ fill: "currentColor", color: "#0F172A" }}>
              <g transform="translate(0.000000,559.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                <path d="M2615 4828 c-2 -7 -11 -51 -20 -98 -49 -255 -124 -380 -273 -458 -62 -33 -269 -92 -321 -92 -36 0 -70 -25 -55 -40 6 -5 49 -17 97 -26 110 -19 206 -48 279 -85 151 -76 222 -194 273 -453 16 -85 25 -112 38 -114 20 -4 20 -4 42 118 63 341 187 466 526 530 63 12 119 26 124 32 16 15 -20 35 -78 42 -147 20 -306 78 -385 143 -90 74 -153 207 -188 398 -21 115 -21 115 -39 115 -9 0 -17 -6 -20 -12z"/>
                <path d="M5036 4818 c-37 -182 -60 -267 -89 -331 -77 -166 -203 -247 -464 -297 -57 -11 -106 -20 -109 -20 -2 0 -4 -9 -4 -19 0 -16 12 -21 68 -31 379 -65 513 -188 576 -525 26 -137 25 -135 45 -135 15 0 20 13 31 78 7 42 23 114 36 160 76 263 207 364 547 423 41 7 71 17 74 26 3 7 4 16 1 18 -2 2 -51 13 -108 25 -362 70 -470 177 -544 538 -16 82 -25 108 -38 110 -11 2 -19 -5 -22 -20z"/>
                <path d="M3905 3448 c-35 -9 -191 -161 -1337 -1307 -1398 -1398 -1331 -1325 -1314 -1413 24 -128 256 -360 384 -384 88 -17 17 -83 1400 1299 796 795 1291 1297 1304 1322 28 54 26 100 -7 165 -59 118 -176 235 -290 292 -65 33 -92 38 -140 26z m61 -392 c41 -40 74 -78 74 -82 0 -5 -105 -115 -234 -243 l-235 -235 -45 38 c-25 20 -62 57 -82 82 l-38 45 235 235 c128 129 238 234 243 234 4 0 42 -33 82 -74z"/>
                <path d="M5045 2578 c-2 -7 -13 -53 -24 -103 -50 -236 -143 -324 -390 -371 -58 -12 -91 -22 -91 -31 0 -7 10 -15 23 -17 142 -30 187 -41 226 -58 139 -58 204 -158 241 -366 12 -67 24 -92 36 -79 3 3 14 49 25 103 50 247 136 333 383 385 89 18 123 34 95 43 -8 3 -56 14 -107 25 -132 29 -203 63 -262 128 -55 60 -83 125 -111 258 -10 50 -19 91 -19 93 0 8 -21 0 -25 -10z"/>
              </g>
            </svg>

            {/* 新野獸派風格的系統名稱 */}
            <span className="text-4xl md:text-5xl font-black text-black bg-yellow-300 px-4 py-1 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] -rotate-2 inline-block z-10">
              ClassAlly
            </span>

            {/* 右側魔杖圖示 */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 559" className="h-12 md:h-14 w-auto drop-shadow-[2px_2px_0px_#000]" style={{ fill: "currentColor", color: "#0F172A" }}>
              <g transform="translate(0.000000,559.000000) scale(0.100000,-0.100000)" fill="currentColor" stroke="none">
                <path d="M2615 4828 c-2 -7 -11 -51 -20 -98 -49 -255 -124 -380 -273 -458 -62 -33 -269 -92 -321 -92 -36 0 -70 -25 -55 -40 6 -5 49 -17 97 -26 110 -19 206 -48 279 -85 151 -76 222 -194 273 -453 16 -85 25 -112 38 -114 20 -4 20 -4 42 118 63 341 187 466 526 530 63 12 119 26 124 32 16 15 -20 35 -78 42 -147 20 -306 78 -385 143 -90 74 -153 207 -188 398 -21 115 -21 115 -39 115 -9 0 -17 -6 -20 -12z"/>
                <path d="M5036 4818 c-37 -182 -60 -267 -89 -331 -77 -166 -203 -247 -464 -297 -57 -11 -106 -20 -109 -20 -2 0 -4 -9 -4 -19 0 -16 12 -21 68 -31 379 -65 513 -188 576 -525 26 -137 25 -135 45 -135 15 0 20 13 31 78 7 42 23 114 36 160 76 263 207 364 547 423 41 7 71 17 74 26 3 7 4 16 1 18 -2 2 -51 13 -108 25 -362 70 -470 177 -544 538 -16 82 -25 108 -38 110 -11 2 -19 -5 -22 -20z"/>
                <path d="M3905 3448 c-35 -9 -191 -161 -1337 -1307 -1398 -1398 -1331 -1325 -1314 -1413 24 -128 256 -360 384 -384 88 -17 17 -83 1400 1299 796 795 1291 1297 1304 1322 28 54 26 100 -7 165 -59 118 -176 235 -290 292 -65 33 -92 38 -140 26z m61 -392 c41 -40 74 -78 74 -82 0 -5 -105 -115 -234 -243 l-235 -235 -45 38 c-25 20 -62 57 -82 82 l-38 45 235 235 c128 129 238 234 243 234 4 0 42 -33 82 -74z"/>
                <path d="M5045 2578 c-2 -7 -13 -53 -24 -103 -50 -236 -143 -324 -390 -371 -58 -12 -91 -22 -91 -31 0 -7 10 -15 23 -17 142 -30 187 -41 226 -58 139 -58 204 -158 241 -366 12 -67 24 -92 36 -79 3 3 14 49 25 103 50 247 136 333 383 385 89 18 123 34 95 43 -8 3 -56 14 -107 25 -132 29 -203 63 -262 128 -55 60 -83 125 -111 258 -10 50 -19 91 -19 93 0 8 -21 0 -25 -10z"/>
              </g>
            </svg>
          </div>
        </div>
        
      </div>
      
      <Card className="w-full max-w-md neo-card p-2 md:p-4 z-10">
        <CardHeader className="space-y-2 text-center border-b-2 border-black pb-6">
          <CardTitle className="text-2xl md:text-3xl font-black uppercase">建立帳號</CardTitle>
          <CardDescription className="font-bold text-gray-600">請填寫以下資料以完成註冊</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <form onSubmit={handleSignUp} className="space-y-5" autoComplete="on">
            <div className="grid grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-black text-base text-black uppercase">姓氏</Label>
                <Input 
                  id="lastName" 
                  name="family-name"
                  placeholder="王" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                  className="neo-input h-12 text-base font-medium focus-visible:ring-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-black text-base text-black uppercase">名字</Label>
                <Input 
                  id="firstName" 
                  name="given-name"
                  placeholder="大明" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                  className="neo-input h-12 text-base font-medium focus-visible:ring-0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="font-black text-base text-black uppercase">電子郵件</Label>
              <Input 
                id="email" 
                name="email"
                placeholder="name@example.com" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                className="neo-input h-12 text-base font-medium focus-visible:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="font-black text-base text-black uppercase">密碼</Label>
              <Input 
                id="password" 
                name="password"
                placeholder="••••••••" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="neo-input h-12 text-base font-medium focus-visible:ring-0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="font-black text-base text-black uppercase">確認密碼</Label>
              <Input 
                id="confirmPassword" 
                name="confirm-password"
                placeholder="••••••••" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                className="neo-input h-12 text-base font-medium focus-visible:ring-0"
              />
            </div>
            <Button 
              className="w-full neo-btn h-12 text-base bg-black text-white hover:bg-gray-800 uppercase" 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? '註冊中...' : '註冊 SIGN UP'}
            </Button>
          </form>
          
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 pt-2 border-t-2 border-black/10 mt-2">
          <div className="text-center text-sm font-bold text-gray-600">
            已經有帳號了嗎？{' '}
            <Link href="/login" className="text-black font-black hover:text-blue-600 hover:underline decoration-2 underline-offset-2 transition-colors">
              立即登入
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}