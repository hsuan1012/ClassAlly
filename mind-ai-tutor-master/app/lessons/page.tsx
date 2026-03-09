'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Clock, Pencil, ExternalLink, Trash2, Eye, Edit, Sparkles, Box, Type } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTranslation } from '@/utils/translations';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';

// --- Helper Functions ---

function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    console.error('Error stringifying object:', error);
    return '[]';
  }
}

function safeParse(str: string, defaultValue: any = []): any {
  try {
    return JSON.parse(str);
  } catch (error) {
    console.error('Error parsing JSON string:', error);
    return defaultValue;
  }
}

function summarizeMarkdownToDescription(content: string, maxLength: number = 200): string {
  if (!content) return '';
  let text = content.replace(/```[\s\S]*?```/g, ' ');
  text = text.replace(/`[^`]*`/g, ' ');
  text = text.replace(/!\[[^\]]*\]\([^\)]*\)/g, ' ');
  text = text.replace(/\[[^\]]*\]\([^\)]*\)/g, (m) => m.replace(/\[[^\]]*\]\([^\)]*\)/, ' '));
  text = text.replace(/[#>*_\-]+/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? text.slice(0, maxLength - 1) + '…' : text;
}

// --- Styles Injection (新野獸派風格) ---
const style = document.createElement('style');
style.textContent = `
  /* 背景網點裝飾 */
  .neo-bg-pattern {
    background-color: #fcfcfc;
    background-image: radial-gradient(#000 1px, transparent 1px);
    background-size: 24px 24px;
  }

  /* 新野獸派卡片：粗框 + 硬陰影 */
  .neo-card {
    border: 3px solid #000;
    background: #fff;
    box-shadow: 6px 6px 0px 0px #000;
    transition: all 0.2s ease;
    border-radius: 8px;
  }
  .neo-card:hover {
    transform: translate(-2px, -2px);
    box-shadow: 8px 8px 0px 0px #000;
  }

  /* 新野獸派按鈕：點擊下壓效果 */
  .neo-btn {
    border: 2px solid #000;
    box-shadow: 4px 4px 0px 0px #000;
    font-weight: 700;
    transition: all 0.1s;
    border-radius: 6px;
  }
  .neo-btn:hover {
    transform: translate(-1px, -1px);
    box-shadow: 5px 5px 0px 0px #000;
  }
  .neo-btn:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0px 0px #000;
  }

  /* 輸入框風格 */
  .neo-input {
    border: 2px solid #000 !important;
    background: #fff;
    box-shadow: 3px 3px 0px 0px rgba(0,0,0,0.1);
    transition: all 0.2s;
    border-radius: 6px;
  }
  .neo-input:focus-within, .neo-input:focus {
    box-shadow: 4px 4px 0px 0px #000 !important;
    outline: none;
    transform: translate(-1px, -1px);
  }

  /* Badge 風格 */
  .neo-badge {
    border: 2px solid #000;
    font-weight: bold;
    color: #000;
    box-shadow: 2px 2px 0px 0px #000;
  }
  
  .content-transition { transition: opacity 0.3s ease-in-out; }
`;
if (typeof document !== 'undefined') document.head.appendChild(style);

// --- Types ---

interface PracticeExercise {
  question: string;
  answer: string;
  explanation: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: number;
  level: string;
  topics: string[];
  genially_link: string;
  teaching_content: string;
  practice_exercises: PracticeExercise[];
  created_at: string;
  markdown_content?: string;
}

// --- Component ---

export default function LessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [practiceExercises, setPracticeExercises] = useState<PracticeExercise[]>([
    { question: "", answer: "", explanation: "" }
  ]);
  
  const { toast } = useToast();
  const [showEditForm, setShowEditForm] = useState(false);
  const { language } = useLanguage();
  const { t } = useTranslation(language);
  const [markdownEditorMode, setMarkdownEditorMode] = useState<'edit' | 'preview'>('edit');
  
  const markdownTexts = useMemo(() => ({
    label: t('markdown_label') || "Markdown 內容",
    placeholder: t('markdown_placeholder') || "在此輸入 Markdown...",
    edit: t('markdown_edit') || "編輯",
    preview: t('markdown_preview') || "預覽",
    empty: t('markdown_empty') || "無內容",
  }), [t]);

  const lessonFormSchema = z.object({
    title: z.string().min(1, t('required_title')),
    markdownContent: z.string().min(1, t('required_content')),
    duration: z.number().min(1, t('duration') + " " + t('exercise_required')),
    level: z.string().min(1, t('level') + " " + t('exercise_required')),
    topics: z.string().min(1, t('required_topics')),
    geniallyLink: z.string().url(t('enter_genially_url')).optional().or(z.literal('')),
    practiceExercises: z.array(z.object({
      question: z.string().min(1, t('question') + " " + t('exercise_required')),
      answer: z.string().min(1, t('answer') + " " + t('exercise_required')),
      explanation: z.string().min(1, t('explanation') + " " + t('exercise_required'))
    })).min(1, t('exercise_required'))
  });

  const translatedLevels = useMemo(() => ({
    beginner: t('beginner'),
    intermediate: t('intermediate'),
    advanced: t('advanced')
  }), [t]);
  
  const form = useForm<z.infer<typeof lessonFormSchema>>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      title: "",
      markdownContent: "",
      duration: 30,
      level: "Beginner",
      topics: "",
      geniallyLink: "",
      practiceExercises: [{ question: "", answer: "", explanation: "" }]
    }
  });

  useEffect(() => {
    const fetchLessons = async () => {
      if (!isLoading) setIsLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        const supabaseClient = supabase();
        const supabaseWithTypes = supabaseClient as any;
        
        const { data, error } = await supabaseWithTypes.from('lessons').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        
        if (data && data.length > 0) {
          const processedData = data.map((lesson: any) => ({
            ...lesson,
            topics: Array.isArray(lesson.topics) ? lesson.topics : (typeof lesson.topics === 'string' ? JSON.parse(lesson.topics || '[]') : []),
            duration: lesson.duration || 0,
            level: lesson.level || 'Beginner',
            genially_link: lesson.genially_link || '',
            teaching_content: lesson.teaching_content || '',
            practice_exercises: Array.isArray(lesson.practice_exercises) ? lesson.practice_exercises : (typeof lesson.practice_exercises === 'string' && lesson.practice_exercises ? JSON.parse(lesson.practice_exercises) : [])
          }));
          setLessons(processedData);
        } else {
          setLessons([]);
        }
      } catch (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } finally {
        setTimeout(() => setIsLoading(false), 100);
      }
    };
    fetchLessons();
  }, []);

  useEffect(() => {
    if (editingLesson) {
      form.reset({
        title: editingLesson.title,
        markdownContent: editingLesson.markdown_content || '',
        duration: editingLesson.duration,
        level: editingLesson.level,
        topics: editingLesson.topics.join(', '),
        geniallyLink: editingLesson.genially_link,
        practiceExercises: editingLesson.practice_exercises || []
      });
      if (editingLesson.practice_exercises && editingLesson.practice_exercises.length > 0) {
        setPracticeExercises([editingLesson.practice_exercises[0]]);
      } else {
        setPracticeExercises([{ question: "", answer: "", explanation: "" }]);
      }
    }
  }, [editingLesson, form]);

  const updatePracticeExercise = (index: number, field: 'question' | 'answer' | 'explanation', value: string) => {
    if (!practiceExercises) {
      setPracticeExercises([{ question: "", answer: "", explanation: "" }]);
      return;
    }
    const updatedExercises = [...practiceExercises];
    if (!updatedExercises[index]) {
      updatedExercises[index] = { question: "", answer: "", explanation: "" };
    }
    updatedExercises[index][field] = value;
    setPracticeExercises(updatedExercises);
    form.setValue('practiceExercises', updatedExercises);
  };

  const onSubmit = async (values: z.infer<typeof lessonFormSchema>) => {
    try {
      const { supabase } = await import('@/lib/supabase');
      const supabaseClient = supabase();
      const supabaseWithTypes = supabaseClient as any;
      const topicsArray = values.topics.split(',').map(topic => topic.trim());
      const derivedDescription = summarizeMarkdownToDescription(values.markdownContent || '');
      
      const basicLessonData = {
        title: values.title,
        duration: values.duration,
        level: values.level,
        topics: topicsArray,
        description: derivedDescription,
      } as any;

      const jsonExtras = {
        genially_link: values.geniallyLink || '',
        teaching_content: '',
        practice_exercises: practiceExercises,
        markdown_content: values.markdownContent || ''
      };

      let lessonData: any = {
        ...basicLessonData,
        genially_link: values.geniallyLink || '',
        teaching_content: '',
        practice_exercises: safeStringify(practiceExercises),
        markdown_content: values.markdownContent || '',
        metadata: safeStringify(jsonExtras)
      };

      if (editingLesson) {
        let response = await supabaseWithTypes.from('lessons').update(lessonData).eq('id', editingLesson.id);
        if (response.error) {
           response = await supabaseWithTypes.from('lessons').update(basicLessonData).eq('id', editingLesson.id);
           if (response.error) throw response.error;
        }
        
        const updatedLesson = {
          ...editingLesson,
          ...basicLessonData,
          genially_link: values.geniallyLink || '',
          teaching_content: '',
          practice_exercises: practiceExercises,
          markdown_content: values.markdownContent || '',
        };
        setLessons(prev => prev.map(lesson => lesson.id === editingLesson.id ? updatedLesson : lesson));
        toast({ title: t('lesson_updated'), description: t('lesson_update_success'), className: "neo-card border-l-8 border-l-yellow-400" });
        setShowEditForm(false);
      } else {
        const fullData = { ...lessonData, created_at: new Date().toISOString() };
        let response = await supabaseWithTypes.from('lessons').insert([fullData]).select('*').single();
        if (response.error) {
           const basicData = { ...basicLessonData, created_at: new Date().toISOString() };
           response = await supabaseWithTypes.from('lessons').insert([basicData]).select('*').single();
           if (response.error) throw response.error;
        }
        
        const inserted = response.data;
        const processedInserted: Lesson = {
          id: inserted.id,
          title: inserted.title,
          description: inserted.description ?? derivedDescription,
          duration: inserted.duration ?? basicLessonData.duration,
          level: inserted.level ?? basicLessonData.level,
          topics: Array.isArray(inserted.topics) ? inserted.topics : (typeof inserted.topics === 'string' ? safeParse(inserted.topics, []) : []),
          genially_link: inserted.genially_link || values.geniallyLink || '',
          teaching_content: '',
          practice_exercises: Array.isArray(inserted.practice_exercises) ? inserted.practice_exercises : (typeof inserted.practice_exercises === 'string' ? safeParse(inserted.practice_exercises, []) : practiceExercises),
          created_at: inserted.created_at || new Date().toISOString(),
          markdown_content: inserted.markdown_content || values.markdownContent || ''
        } as Lesson;

        setLessons(prev => [processedInserted, ...prev]);
        toast({ title: t('lesson_created'), description: t('lesson_create_success'), className: "neo-card border-l-8 border-l-green-400" });
        setShowEditForm(false);
      }
      setEditingLesson(null);
      form.reset();
      setPracticeExercises([{ question: "", answer: "", explanation: "" }]);
    } catch (error: any) {
      console.error('Error saving lesson:', error);
      toast({ title: `${t(editingLesson ? 'lesson_error_update' : 'lesson_error_create')}`, description: error.message || t('try_again'), variant: 'destructive', className: "neo-card border-l-8 border-l-red-500" });
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm(t('delete_lesson_confirm'))) return;
    try {
      setIsLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const supabaseClient = supabase();
      const supabaseWithTypes = supabaseClient as any;
      
      const { error } = await supabaseWithTypes.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      
      setLessons(lessons.filter(lesson => lesson.id !== lessonId));
      toast({ title: t('lesson_deleted'), description: t('lesson_delete_success'), className: "neo-card border-l-8 border-l-gray-500" });
    } catch (error: any) {
      toast({ title: t('lesson_error_delete'), description: error.message || t('lesson_error_delete_msg'), variant: 'destructive', className: "neo-card border-l-8 border-l-red-500" });
    } finally {
      setIsLoading(false);
    }
  };

  function getLevelColor(level: string) {
    switch (level.toLowerCase()) {
      case 'beginner': return 'bg-green-300 text-black border-2 border-black';
      case 'intermediate': return 'bg-yellow-300 text-black border-2 border-black';
      case 'advanced': return 'bg-red-400 text-black border-2 border-black';
      default: return 'bg-gray-200 text-black border-2 border-black';
    }
  }

  function translateLevel(level: string) {
    const lowerLevel = level.toLowerCase();
    return lowerLevel === 'beginner' ? translatedLevels.beginner :
           lowerLevel === 'intermediate' ? translatedLevels.intermediate :
           lowerLevel === 'advanced' ? translatedLevels.advanced : level;
  }

  return (
    <div className="space-y-6 neo-bg-pattern min-h-screen p-4">
      <PageHeader
        heading={t('lessons')}
        text={t('manage_lessons')}
        actions={
          <div className="flex space-x-2">
            {!showEditForm && (
              <Button 
                onClick={() => {
                  setEditingLesson(null);
                  setShowEditForm(true);
                  setPracticeExercises([{ question: "", answer: "", explanation: "" }]);
                  form.reset({ title: "", markdownContent: "", duration: 30, level: "Beginner", topics: "", geniallyLink: "", practiceExercises: [{ question: "", answer: "", explanation: "" }] });
                }}
                className="neo-btn bg-violet-500 text-white hover:bg-violet-600 px-6 h-10"
              >
                <PlusCircle className="mr-2 h-5 w-5 stroke-2" />{t('create_lesson')}
              </Button>
            )}
          </div>
        }
      />
      
      {isLoading ? (
        <div className="flex flex-col justify-center items-center py-20 min-h-[60vh]">
          <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full mb-4"></div>
          <p className="text-xl font-bold font-mono">{t('loading_lessons')}</p>
        </div>
      ) : (
        <div className="content-transition">
          {showEditForm ? (
            <div className="min-h-[60vh] neo-card p-8 bg-white relative">
              {/* 裝飾性元素 */}
              <div className="absolute top-4 right-4 bg-yellow-300 border-2 border-black p-1 rounded">
                <Sparkles className="h-6 w-6 text-black" />
              </div>

              <div className="mb-8 flex justify-between items-center border-b-2 border-black pb-4">
                <h2 className="text-2xl font-black flex items-center gap-2">
                  {editingLesson ? <Edit className="h-6 w-6 stroke-[3px]"/> : <PlusCircle className="h-6 w-6 stroke-[3px]"/>}
                  {editingLesson ? t('edit_lesson') : t('create_lesson')}
                </h2>
                <Button variant="ghost" onClick={() => setShowEditForm(false)} className="neo-btn bg-gray-200 hover:bg-gray-300 text-black">{t('cancel')}</Button>
              </div>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Title & Duration & Level Fields */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-black text-lg">{t('title')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('enter_lesson_title')} {...field} className="neo-input h-12 text-lg" />
                        </FormControl>
                        <FormMessage className="text-red-600 font-bold" />
                      </FormItem>
                    )} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="duration" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-black text-lg">{t('duration')} ({t('minutes')})</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="neo-input h-12" />
                          </FormControl>
                          <FormMessage className="text-red-600 font-bold" />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="level" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-bold text-black text-lg">{t('level')}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="neo-input h-12">
                                <SelectValue placeholder={t('select_level')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="border-2 border-black shadow-[4px_4px_0px_0px_#000]">
                              <SelectItem value="Beginner" className="focus:bg-green-200 font-bold">{t('beginner')}</SelectItem>
                              <SelectItem value="Intermediate" className="focus:bg-yellow-200 font-bold">{t('intermediate')}</SelectItem>
                              <SelectItem value="Advanced" className="focus:bg-red-200 font-bold">{t('advanced')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-600 font-bold" />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                  
                  {/* Topics & Link */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="topics" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-black text-lg">{t('topics')} ({t('comma_separated')})</FormLabel>
                        <FormControl>
                          <Input placeholder={t('topics_placeholder')} {...field} className="neo-input h-12" />
                        </FormControl>
                        <FormMessage className="text-red-600 font-bold" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="geniallyLink" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-black text-lg">{t('genially_link')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('enter_genially_url')} {...field} className="neo-input h-12" />
                        </FormControl>
                        <FormMessage className="text-red-600 font-bold" />
                      </FormItem>
                    )} />
                  </div>
                  
                  {/* Markdown Content Field */}
                  <FormField control={form.control} name="markdownContent" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel className="font-bold text-black text-lg">{markdownTexts.label}</FormLabel>
                        <div className="flex space-x-2">
                          <Button type="button" size="sm" onClick={() => setMarkdownEditorMode('edit')} className={`neo-btn h-8 ${markdownEditorMode === 'edit' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                            <Edit className="h-3.5 w-3.5 mr-1" />{markdownTexts.edit}
                          </Button>
                          <Button type="button" size="sm" onClick={() => setMarkdownEditorMode('preview')} className={`neo-btn h-8 ${markdownEditorMode === 'preview' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />{markdownTexts.preview}
                          </Button>
                        </div>
                      </div>
                      <FormControl>
                        <div className="neo-input p-0 overflow-hidden">
                          {markdownEditorMode === 'edit' ? (
                            <div className="md:max-w-full overflow-x-auto bg-gray-50">
                              <MarkdownEditor value={field.value || ''} onChange={field.onChange} placeholder={markdownTexts.placeholder} />
                            </div>
                          ) : (
                            <div className="p-4 min-h-[300px] max-h-[500px] overflow-y-auto bg-white prose max-w-none prose-headings:font-black prose-p:font-medium">
                              {field.value ? <MarkdownRenderer content={field.value} /> : <div className="text-muted-foreground italic font-mono">{markdownTexts.empty}</div>}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      {form.formState.errors.markdownContent && <p className="text-sm font-bold text-red-600 mt-1">{t('required_content')}</p>}
                    </FormItem>
                  )} />

                  {/* Practice Exercises Fields */}
                  <FormField control={form.control} name="practiceExercises" render={() => (
                    <FormItem>
                      <FormLabel className="font-bold text-black text-lg flex items-center gap-2">
                         <Box className="h-5 w-5"/>
                         {t('practice_exercises')}
                      </FormLabel>
                      <FormControl>
                        <div className="p-6 border-2 border-black bg-blue-50 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                          {/* 👇 外層統一使用 space-y-5 來控制所有格子的垂直間距 */}
                          <div className="space-y-5">
                            {/* 問題區塊 */}
                            <div>
                              <FormLabel className="text-sm font-bold text-black uppercase tracking-wider">{t('question')}</FormLabel>
                              <Textarea 
                                placeholder={t('enter_question')} 
                                value={practiceExercises[0]?.question || ""} 
                                onChange={(e) => updatePracticeExercise(0, 'question', e.target.value)} 
                                className="neo-input resize-y bg-white min-h-[400px] text-base p-3" 
                              />
                            </div>
                            
                            {/* 👇 答案區塊 (取消了原本的 grid 並排設定) */}
                            <div>
                              <FormLabel className="text-sm font-bold text-black uppercase tracking-wider">{t('answer')}</FormLabel>
                              <Textarea 
                                placeholder={t('enter_answer')} 
                                value={practiceExercises[0]?.answer || ""} 
                                onChange={(e) => updatePracticeExercise(0, 'answer', e.target.value)} 
                                className="neo-input resize-y bg-white min-h-[120px] text-base p-3" 
                              />
                            </div>
                            
                            {/* 👇 解釋區塊 */}
                            <div>
                              <FormLabel className="text-sm font-bold text-black uppercase tracking-wider">{t('explanation')}</FormLabel>
                              <Textarea 
                                placeholder={t('enter_explanation')} 
                                value={practiceExercises[0]?.explanation || ""} 
                                onChange={(e) => updatePracticeExercise(0, 'explanation', e.target.value)} 
                                className="neo-input resize-y bg-white min-h-[400px] text-base p-3" 
                              />
                            </div>
                            
                          </div>
                        </div>
                      </FormControl>
                    </FormItem>
                  )} />
                  
                  <div className="flex justify-end gap-3 pt-6 border-t-2 border-black">
                    <Button type="button" variant="ghost" onClick={() => setShowEditForm(false)} className="neo-btn bg-white hover:bg-gray-100 text-black px-6">{t('cancel')}</Button>
                    <Button type="submit" className="neo-btn bg-black text-white hover:bg-gray-800 px-8 hover:translate-x-0 hover:translate-y-0">{editingLesson ? t('save_changes') : t('create_lesson')}</Button>
                  </div>
                </form>
              </Form>
            </div>
          ) : (
            <div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 min-h-[60vh]">
                {lessons.map((lesson) => (
                  <Card key={lesson.id} className="neo-card flex flex-col h-full overflow-hidden group">
                    <CardHeader className="pb-3 border-b-2 border-black bg-gray-50">
                      <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-xl font-black text-black line-clamp-1 leading-tight tracking-tight">{lesson.title}</CardTitle>
                          <Badge variant="outline" className={`neo-badge ${getLevelColor(lesson.level)} text-xs uppercase px-2 py-0.5 rounded-sm`}>{translateLevel(lesson.level)}</Badge>
                      </div>
                      <CardDescription className="line-clamp-2 text-gray-600 mt-2 font-medium font-mono text-xs">{lesson.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow pt-4">
                      <div className="flex items-center gap-2 text-sm font-bold text-black mb-3">
                        <Clock className="h-4 w-4 stroke-[3px]" />
                        <span>{lesson.duration} {t('minutes')}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {Array.isArray(lesson.topics) ? lesson.topics.slice(0, 3).map((topic) => (
                          <Badge key={topic} variant="secondary" className="neo-badge bg-white text-black text-[10px] rounded-sm shadow-none hover:bg-gray-100">{topic}</Badge>
                        )) : null}
                        {Array.isArray(lesson.topics) && lesson.topics.length > 3 && (
                            <Badge variant="secondary" className="neo-badge bg-gray-200 text-black text-[10px] rounded-sm shadow-none">+{lesson.topics.length - 3}</Badge>
                        )}
                      </div>
                      {lesson.genially_link && (
                        <div className="mt-auto text-sm">
                          <a href={lesson.genially_link} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-600 hover:text-blue-800 font-black underline decoration-2 underline-offset-2 transition-colors">
                            <ExternalLink className="h-4 w-4 mr-1 stroke-[3px]" />{t('view_presentation')}
                          </a>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-white pt-3 mt-auto border-t-2 border-black">
                      <div className="flex w-full justify-end gap-3">
                        <Button variant="ghost" size="sm" className="neo-btn h-8 w-8 p-0 bg-red-100 hover:bg-red-200 text-red-900 border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_#000]" onClick={() => deleteLesson(lesson.id)}>
                            <Trash2 className="h-4 w-4 stroke-[2.5px]" />
                            <span className="sr-only">{t('delete')}</span>
                        </Button>
                        <Button variant="outline" size="sm" className="neo-btn h-8 bg-yellow-300 hover:bg-yellow-400 text-black border-2 border-black rounded-sm shadow-[2px_2px_0px_0px_#000] px-4 font-bold" onClick={() => { setEditingLesson(lesson); setShowEditForm(true); setPracticeExercises(lesson.practice_exercises && lesson.practice_exercises.length > 0 ? [lesson.practice_exercises[0]] : [{ question: "", answer: "", explanation: "" }]); }}>
                            <Pencil className="mr-1.5 h-3.5 w-3.5 stroke-[2.5px]" />{t('edit')}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}