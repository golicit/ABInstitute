// src/pages/CourseReader.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import EReaderSecurityWrapper from '@/components/security/EReaderSecurityWrapper';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Maximize2,
  Minimize2,
  Save,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  X,
} from 'lucide-react';

type Topic = {
  _id: string;
  title: string;
  images: string[]; // urls or public paths
};

type Course = {
  _id: string;
  title: string;
  topics: Topic[];
  price?: number;
  userHasAccess?: boolean;
};

type TourStep = {
  id: number;
  title: string;
  description: string;
  elementId: string;
  elementName: string;
};

export default function CourseReader() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { updateCourseProgress } = useApp();

  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [activeTopicIndex, setActiveTopicIndex] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0); // index in images
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, Record<number, string>>>(
    {}
  );
  const [loadingSave, setLoadingSave] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [currentTourStep, setCurrentTourStep] = useState<number>(0);
  const [isScrollingToElement, setIsScrollingToElement] =
    useState<boolean>(false);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const tourTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const preloaded = useRef<Record<string, HTMLImageElement>>({}); // simple cache

  // NEW: per-topic set of viewed pages (stored in local state as Sets)
  const [viewedPages, setViewedPages] = useState<Record<string, Set<number>>>(
    {}
  );
  // NEW: completed topics persisted separately
  const [completedTopics, setCompletedTopics] = useState<
    Record<string, boolean>
  >({});

  // Calculate active topic and total pages early to avoid declaration issues
  const activeTopic = topics[activeTopicIndex];
  const totalPages = activeTopic?.images?.length ?? 0;

  // Tour steps definition - simpler mobile-friendly approach
  const tourSteps: TourStep[] = [
    {
      id: 1,
      title: 'Welcome to Course Reader! 👋',
      description:
        "Let me guide you through all the features of this course reader. I'll show you each important button and feature one by one.",
      elementId: 'welcome',
      elementName: 'Welcome',
    },
    {
      id: 2,
      title: '📖 Previous & Next Page Buttons',
      description:
        "These buttons let you navigate between pages. Click 'Previous Page' to go back or 'Next Page' to move forward. You can also use arrow keys on your keyboard.",
      elementId: 'page-nav-buttons',
      elementName: 'Page Navigation Buttons',
    },
    {
      id: 3,
      title: '📊 Progress Indicator',
      description:
        'This bar shows your progress in the current topic. It fills up as you read pages and updates automatically.',
      elementId: 'progress-indicator',
      elementName: 'Progress Bar',
    },
    {
      id: 4,
      title: '✅ Mark as Complete Button',
      description:
        'When you finish studying a topic, click this button to mark it as complete. It will save your progress and can automatically move to the next topic.',
      elementId: 'mark-complete-btn',
      elementName: 'Mark Complete Button',
    },
    {
      id: 5,
      title: '🔍 Fullscreen Button',
      description:
        "Click here to enter fullscreen mode for distraction-free reading. Press 'F' on your keyboard or ESC to exit fullscreen.",
      elementId: 'fullscreen-btn',
      elementName: 'Fullscreen Button',
    },
    {
      id: 6,
      title: '📝 Notes Section',
      description:
        'Write your thoughts, questions, and key takeaways here for each page. Your notes are automatically saved locally.',
      elementId: 'notes-section',
      elementName: 'Notes Section',
    },
    {
      id: 7,
      title: '📚 Topics Sidebar',
      description:
        'This sidebar shows all topics in the course. Click any topic to jump directly to it. Green checkmarks show completed topics.',
      elementId: 'topics-sidebar',
      elementName: 'Topics List',
    },
    {
      id: 8,
      title: '📈 Overall Progress Card',
      description:
        "See your complete course progress here. Track how much you've completed and view detailed progress.",
      elementId: 'overall-progress',
      elementName: 'Progress Summary',
    },
    {
      id: 9,
      title: "🎉 You're Ready to Learn!",
      description:
        "That's all the features! You can restart this tour anytime by clicking the Help button. Happy learning!",
      elementId: 'welcome',
      elementName: 'Finish',
    },
  ];

  // Guard: auth & profile
  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  // Build fallback topics with your custom ranges (from user)
  const buildFallbackTopics = (): Topic[] => {
    return [
      {
        _id: 't1',
        title: 'Introduction',
        images: Array.from({ length: 17 }, (_, i) => `/course/${2 + i}.jpeg`), // 2–18
      },
      {
        _id: 't2',
        title: 'Understanding Doji Candles',
        images: Array.from({ length: 4 }, (_, i) => `/course/${19 + i}.jpeg`), // 19–22
      },
      {
        _id: 't3',
        title: 'The "Dicy Reversal" Setup',
        images: Array.from({ length: 7 }, (_, i) => `/course/${23 + i}.jpeg`), // 23–29
      },
      {
        _id: 't4',
        title: 'Entry & Exit Rules',
        images: Array.from({ length: 5 }, (_, i) => `/course/${30 + i}.jpeg`), // 30–34
      },
      {
        _id: 't5',
        title: 'Risk Management',
        images: Array.from({ length: 13 }, (_, i) => `/course/${35 + i}.jpeg`), // 35–47
      },
      {
        _id: 't6',
        title: 'Practical Examples',
        images: Array.from({ length: 5 }, (_, i) => `/course/${48 + i}.jpeg`), // 48–52
      },
      {
        _id: 't7',
        title: 'Final Thoughts',
        images: Array.from({ length: 4 }, (_, i) => `/course/${53 + i}.jpeg`), // 53–56
      },
      {
        _id: 't8',
        title: "Author's Message",
        images: Array.from({ length: 2 }, (_, i) => `/course/${57 + i}.jpeg`), // 57–58
      },
    ];
  };

  // Load course + topics; if backend not available or no topics, fallback to our topics
  useEffect(() => {
    if (!courseId) return;
    (async () => {
      try {
        const res = await apiClient.get<{ data: { course: Course } }>(
          `/courses/${courseId}`
        );
        const courseData = res.data?.data?.course;

        if (!courseData) {
          // fallback local topics
          const fallback = {
            _id: courseId,
            title: 'Option Analysis Strategy',
            topics: buildFallbackTopics(),
            price: 1499,
            userHasAccess: true,
          } as Course;
          setCourse(fallback);
          setTopics(fallback.topics);
          const p: Record<string, number> = {};
          fallback.topics.forEach(
            (t) => (p[t._id] = completedTopics[t._id] ? 100 : 0)
          );
          setProgress(p);
          return;
        }

        if (!courseData.topics || courseData.topics.length === 0) {
          courseData.topics = buildFallbackTopics();
        }

        setCourse(courseData);
        setTopics(courseData.topics || []);

        // try to fetch progress & notes if backend supports
        try {
          const progRes = await apiClient.get<{
            data: { progress: Record<string, number> };
          }>(`/courses/${courseId}/progress`);
          setProgress(progRes.data.data.progress || {});
        } catch {
          // fallback: 0% for each topic
          const p: Record<string, number> = {};
          (courseData.topics || []).forEach(
            (t) => (p[t._id] = completedTopics[t._id] ? 100 : 0)
          );
          setProgress(p);
        }

        try {
          const notesRes = await apiClient.get<{
            data: { notes: Record<string, Record<number, string>> };
          }>(`/courses/${courseId}/notes`);
          setNotes(notesRes.data.data.notes || {});
        } catch {
          const ls = localStorage.getItem(`notes_${courseId}`);
          if (ls) setNotes(JSON.parse(ls));
        }
      } catch {
        // fallback if network error
        const fallback = {
          _id: courseId,
          title: 'Option Analysis Strategy',
          topics: buildFallbackTopics(),
          price: 1499,
          userHasAccess: true,
        } as Course;
        setCourse(fallback);
        setTopics(fallback.topics);
        const p: Record<string, number> = {};
        fallback.topics.forEach(
          (t) => (p[t._id] = completedTopics[t._id] ? 100 : 0)
        );
        setProgress(p);

        const ls = localStorage.getItem(`notes_${courseId}`);
        if (ls) setNotes(JSON.parse(ls));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Start tour when course is loaded (only first time)
  useEffect(() => {
    if (!course || !user) return;

    const hasSeenTour = localStorage.getItem(
      `reader_tour_${courseId}_${user._id}`
    );

    if (!hasSeenTour) {
      // Small delay to let page load completely
      const timer = setTimeout(() => {
        setShowTour(true);
        setCurrentTourStep(0);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [course, user, courseId]);

  // Scroll to element when tour step changes (except first and last welcome/finish steps)
  useEffect(() => {
    if (
      !showTour ||
      currentTourStep === 0 ||
      currentTourStep === tourSteps.length - 1
    )
      return;

    const currentStep = tourSteps[currentTourStep];
    if (currentStep.elementId === 'welcome') return;

    setIsScrollingToElement(true);

    // Clear any existing timeout
    if (tourTimeoutRef.current) {
      clearTimeout(tourTimeoutRef.current);
    }

    // Small delay before scrolling to ensure DOM is ready
    tourTimeoutRef.current = setTimeout(() => {
      const element = document.getElementById(currentStep.elementId);
      if (element) {
        // Scroll element into view with smooth behavior
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });

        // Add highlight effect
        element.classList.add('highlight-element');

        // Remove highlight after a delay
        setTimeout(() => {
          element.classList.remove('highlight-element');
          setIsScrollingToElement(false);
        }, 1500);
      } else {
        setIsScrollingToElement(false);
      }
    }, 300);

    return () => {
      if (tourTimeoutRef.current) {
        clearTimeout(tourTimeoutRef.current);
      }
    };
  }, [showTour, currentTourStep, tourSteps]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields or during tour
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        showTour
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
          if (currentPage > 0) {
            setCurrentPage((p) => p - 1);
          }
          break;
        case 'ArrowRight':
        case 'd':
          if (currentPage < totalPages - 1) {
            setCurrentPage((p) => p + 1);
          }
          break;
        case 'f':
          toggleFull();
          break;
        case ' ':
          e.preventDefault();
          if (currentPage < totalPages - 1) {
            setCurrentPage((p) => p + 1);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, showTour]);

  // Check if user owns the course
  const userOwnsCourse = useMemo(() => {
    if (!course || !user) return false;
    return course.userHasAccess === true;
  }, [course, user]);

  // Simple UI lock check
  const isLocked = !!course && course.userHasAccess === false;

  // load persisted viewedPages & completedTopics from localStorage when topics are ready
  useEffect(() => {
    if (!courseId || topics.length === 0) return;

    // viewedPages
    const vp = localStorage.getItem(`viewedPages_${courseId}`);
    if (vp) {
      try {
        const parsed: Record<string, number[]> = JSON.parse(vp);
        const converted: Record<string, Set<number>> = {};
        Object.entries(parsed).forEach(([k, arr]) => {
          converted[k] = new Set(arr);
        });
        setViewedPages(converted);
      } catch {
        setViewedPages({});
      }
    }

    // completedTopics
    const ct = localStorage.getItem(`completedTopics_${courseId}`);
    if (ct) {
      try {
        const parsed: Record<string, boolean> = JSON.parse(ct);
        setCompletedTopics(parsed);
        // reflect in progress
        setProgress((prev) => {
          const copy = { ...prev };
          Object.keys(parsed).forEach((tid) => {
            if (parsed[tid]) copy[tid] = 100;
          });
          return copy;
        });
      } catch {
        // noop
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics, courseId]);

  // Preload current/adjacent images
  useEffect(() => {
    if (!activeTopic) return;
    const keyBase = String(activeTopic._id);
    const toPreload = [currentPage - 1, currentPage, currentPage + 1].filter(
      (i) => i >= 0 && i < activeTopic.images.length
    );
    toPreload.forEach((idx) => {
      const url = activeTopic.images[idx];
      const key = `${keyBase}_${idx}`;
      if (!preloaded.current[key]) {
        const img = new Image();
        img.src = url;
        preloaded.current[key] = img;
      }
    });
  }, [activeTopic, currentPage]);

  const shouldRenderImage = (idx: number) => Math.abs(idx - currentPage) <= 2;

  // bookmark save
  const saveBookmark = async (topicId: string, imageIndex: number) => {
    try {
      await apiClient.post(`/courses/${courseId}/bookmark`, {
        topicId,
        imageIndex,
      });
    } catch {
      const key = `bookmark_${courseId}`;
      localStorage.setItem(key, JSON.stringify({ topicId, imageIndex }));
    }
  };

  // load bookmark on mount -> if exists local or backend
  useEffect(() => {
    (async () => {
      // try backend
      try {
        const bookmarkRes = await apiClient.get<{
          data: { bookmark: { topicId: string; imageIndex: number } | null };
        }>(`/courses/${courseId}/bookmark`);
        const bm = bookmarkRes.data.data.bookmark;

        if (bm) {
          const topicIndex = topics.findIndex((t) => t._id === bm.topicId);
          if (topicIndex >= 0) {
            setActiveTopicIndex(topicIndex);
            setCurrentPage(bm.imageIndex);
            return;
          }
        }
      } catch {
        const ls = localStorage.getItem(`bookmark_${courseId}`);
        if (ls) {
          const bm = JSON.parse(ls);
          const topicIndex = topics.findIndex((t) => t._id === bm.topicId);
          if (topicIndex >= 0) {
            setActiveTopicIndex(topicIndex);
            setCurrentPage(bm.imageIndex);
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  // Auto-save bookmark whenever page changes
  useEffect(() => {
    if (!activeTopic) return;
    saveBookmark(activeTopic._id, currentPage);
  }, [currentPage, activeTopic]);

  // Save viewed page when page changes (page-level tracking)
  useEffect(() => {
    if (!activeTopic) return;

    setViewedPages((prev) => {
      const updated: Record<string, Set<number>> = {};
      // shallow copy existing sets
      Object.entries(prev).forEach(([k, set]) => {
        updated[k] = new Set(set);
      });

      if (!updated[activeTopic._id]) updated[activeTopic._id] = new Set();
      updated[activeTopic._id].add(currentPage);

      // persist to localStorage as arrays
      const toStore: Record<string, number[]> = {};
      Object.entries(updated).forEach(([k, s]) => {
        toStore[k] = Array.from(s);
      });
      localStorage.setItem(`viewedPages_${courseId}`, JSON.stringify(toStore));

      return updated;
    });
  }, [currentPage, activeTopic, courseId]);

  // Weighted overall progress based on viewed pages (pages viewed / total pages)
  const weightedProgress = useMemo(() => {
    let totalPages = 0;
    let viewedCount = 0;

    topics.forEach((topic) => {
      const pageCount = topic.images.length;
      totalPages += pageCount;
      const viewed = viewedPages[topic._id]?.size || 0;
      viewedCount += viewed;
    });

    if (totalPages === 0) return 0;
    return Math.round((viewedCount / totalPages) * 100);
  }, [topics, viewedPages]);

  // Sync weighted progress to context so dashboard shows it
  useEffect(() => {
    if (!courseId) return;
    updateCourseProgress(courseId, weightedProgress);
    localStorage.setItem(
      `overallProgress_${courseId}`,
      String(weightedProgress)
    );

    // optionally sync to backend (placeholder)
    (async () => {
      try {
        await apiClient.post(`/courses/${courseId}/progress`, {
          overall: weightedProgress,
          perTopic: progress, // best-effort
        });
      } catch {
        // backend may not be available now — that's ok
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weightedProgress, courseId]);

  // Mark topic complete — manual (marks, saves, then ADVANCES to next topic)
  const markTopicComplete = async (topicId: string) => {
    // optimistic local update
    setProgress((prev) => ({ ...prev, [topicId]: 100 }));

    // mark completedTopics and persist
    setCompletedTopics((prev) => {
      const copy = { ...prev, [topicId]: true };
      localStorage.setItem(`completedTopics_${courseId}`, JSON.stringify(copy));
      return copy;
    });

    // ensure all pages flagged as viewed for weighted progress
    const topic = topics.find((t) => t._id === topicId);
    if (topic) {
      setViewedPages((prev) => {
        const updated = { ...prev };
        updated[topicId] = new Set(topic.images.map((_, i) => i));
        const toStore: Record<string, number[]> = {};
        Object.entries(updated).forEach(
          ([k, s]) => (toStore[k] = Array.from(s))
        );
        localStorage.setItem(
          `viewedPages_${courseId}`,
          JSON.stringify(toStore)
        );
        return updated;
      });
    }

    // backend placeholder: mark topic complete
    try {
      await apiClient.post(`/courses/${courseId}/topics/${topicId}/complete`);
    } catch {
      // ignore backend error
    }

    toast({
      title: '✔ Topic Completed',
      description: `${topic?.title ?? 'Topic'} marked complete.`,
    });

    // advance to next topic
    const nextIndex = activeTopicIndex + 1;
    if (nextIndex < topics.length) {
      setActiveTopicIndex(nextIndex);
      setCurrentPage(0);
      toast({
        title: '➡ Moving to Next Topic',
        description: `Now reading: ${topics[nextIndex]?.title}`,
        duration: 3000,
      });
    } else {
      toast({
        title: '🎉 Course Completed',
        description:
          'Congratulations! You have finished all topics in this course.',
        duration: 6000,
      });
    }
  };

  // Auto-complete when user reaches last page of a topic
  useEffect(() => {
    if (!activeTopic) return;
    const lastPage = activeTopic.images.length - 1;
    if (currentPage === lastPage && (progress[activeTopic._id] || 0) < 100) {
      // mark progress locally (but don't auto-advance)
      setProgress((prev) => ({ ...prev, [activeTopic._id]: 100 }));

      // mark all pages as viewed for this topic
      setViewedPages((prev) => {
        const updated = { ...prev };
        updated[activeTopic._id] = new Set(activeTopic.images.map((_, i) => i));
        const toStore: Record<string, number[]> = {};
        Object.entries(updated).forEach(
          ([k, s]) => (toStore[k] = Array.from(s))
        );
        localStorage.setItem(
          `viewedPages_${courseId}`,
          JSON.stringify(toStore)
        );
        return updated;
      });

      // persist completed flag
      setCompletedTopics((prev) => {
        const copy = { ...prev, [activeTopic._id]: true };
        localStorage.setItem(
          `completedTopics_${courseId}`,
          JSON.stringify(copy)
        );
        return copy;
      });

      // try to tell backend (non-blocking)
      (async () => {
        try {
          await apiClient.post(
            `/courses/${courseId}/topics/${activeTopic._id}/complete`
          );
        } catch {
          // ignore backend failure
        }
      })();

      toast({
        title: '🎉 Topic Completed',
        description: `${activeTopic.title} — auto-marked as complete.`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, activeTopic]);

  // Save note (backend when available else localStorage)
  const handleNoteChange = (
    topicId: string,
    imageIndex: number,
    text: string
  ) => {
    setNotes((prev) => {
      const copy = { ...prev };
      copy[topicId] = copy[topicId] || {};
      copy[topicId][imageIndex] = text;
      localStorage.setItem(`notes_${courseId}`, JSON.stringify(copy));
      return copy;
    });
  };

  const saveNote = async (topicId: string, imageIndex: number) => {
    const text = notes[topicId]?.[imageIndex] || '';
    setLoadingSave(true);
    try {
      await apiClient.post(
        `/courses/${courseId}/topics/${topicId}/images/${imageIndex}/note`,
        { note: text }
      );
      toast({
        title: 'Saved to Server',
        description: 'Note saved and synced across devices.',
      });
    } catch {
      toast({
        title: 'Saved Locally',
        description: 'Note saved locally and will sync when online.',
      });
    } finally {
      setLoadingSave(false);
    }
  };

  // Fullscreen toggle
  const toggleFull = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
      setIsFullscreen(true);
      toast({
        title: '🔍 Entered Fullscreen',
        description: 'Press ESC to exit. Use mouse wheel to zoom.',
        duration: 3000,
      });
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Helper function to get readable progress status
  const getProgressStatus = (percent: number) => {
    if (percent === 0) return 'Not Started';
    if (percent < 100) return 'In Progress';
    return 'Completed';
  };

  // Tour navigation functions
  const nextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep(currentTourStep + 1);
    } else {
      finishTour();
    }
  };

  const prevTourStep = () => {
    if (currentTourStep > 0) {
      setCurrentTourStep(currentTourStep - 1);
    }
  };

  const finishTour = () => {
    setShowTour(false);
    setCurrentTourStep(0);
    if (user && courseId) {
      localStorage.setItem(`reader_tour_${courseId}_${user._id}`, 'true');
    }
    toast({
      title: '🎉 Tour Completed',
      description:
        'You can restart the tour anytime by clicking the Help icon.',
      duration: 3000,
    });
  };

  const restartTour = () => {
    setShowTour(true);
    setCurrentTourStep(0);
  };

  const skipTour = () => {
    setShowTour(false);
    setCurrentTourStep(0);
    if (user && courseId) {
      localStorage.setItem(`reader_tour_${courseId}_${user._id}`, 'true');
    }
  };

  const currentStep = tourSteps[currentTourStep];

  return (
    <EReaderSecurityWrapper>
      {/* Add CSS for highlight animation */}
      <style>{`
        .highlight-element {
          animation: highlightPulse 1.5s ease-in-out;
          position: relative;
          z-index: 10;
        }
        
        @keyframes highlightPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(246, 163, 47, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(246, 163, 47, 0.4);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(246, 163, 47, 0);
          }
        }
      `}</style>

      <main className='min-h-screen bg-gradient-to-br from-[#0b1f3a] to-[#090e1d] text-white p-4 relative'>
        {/* Tour Modal - COMPLETELY transparent background */}
        {showTour && (
          <div
            className='fixed inset-0 z-9999 flex items-center justify-center p-4'
            style={{ zIndex: 9999 }}
          >
            {/* No background overlay at all - completely transparent */}
            <div className='bg-gradient-to-br from-[#1a2d4d] to-[#0f1a2f] rounded-xl border border-white/20 max-w-md w-full shadow-2xl'>
              <div className='p-6'>
                {/* Header */}
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-[#22C3B3]/20 flex items-center justify-center'>
                      <HelpCircle className='w-6 h-6 text-[#22C3B3]' />
                    </div>
                    <div>
                      <h3 className='text-xl font-bold'>{currentStep.title}</h3>
                      <div className='text-sm text-white/60 mt-1'>
                        Step {currentStep.id} of {tourSteps.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className='mb-4'>
                  <p className='text-white/90 leading-relaxed'>
                    {currentStep.description}
                  </p>
                </div>

                {/* Navigation Buttons */}
                <div className='flex flex-col sm:flex-row gap-3'>
                  <div className='flex gap-3'>
                    <Button
                      variant='outline'
                      onClick={prevTourStep}
                      disabled={currentTourStep === 0}
                      className='border-white/20 text-white flex-1'
                    >
                      ← Previous
                    </Button>

                    {currentTourStep < tourSteps.length - 1 ? (
                      <Button
                        onClick={nextTourStep}
                        className='bg-[#22C3B3] hover:bg-[#1AA298] text-white flex-1 gap-2'
                      >
                        Next Step
                        <ArrowRight className='w-4 h-4' />
                      </Button>
                    ) : (
                      <Button
                        onClick={finishTour}
                        className='bg-green-600 hover:bg-green-700 text-white flex-1'
                      >
                        Finish Tour
                      </Button>
                    )}
                  </div>

                  {currentTourStep < tourSteps.length - 1 && (
                    <Button
                      variant='ghost'
                      onClick={skipTour}
                      className='text-white/70 hover:text-white border-white/10'
                    >
                      Skip Tour
                    </Button>
                  )}
                </div>

                {/* Progress Dots */}
                <div className='flex justify-center gap-2 mt-6'>
                  {tourSteps.map((step, index) => (
                    <div
                      key={step.id}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentTourStep
                          ? 'bg-[#22C3B3] w-6'
                          : index < currentTourStep
                          ? 'bg-green-500'
                          : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className='max-w-[1300px] mx-auto'>
          {/* Mobile: Stack everything vertically, Desktop: Use grid */}
          <div className='flex flex-col md:grid md:grid-cols-12 gap-4'>
            {/* MAIN READER - Full width on mobile, 9 cols on desktop */}
            <section className='col-span-12 md:col-span-9 order-1 md:order-1'>
              <Card className='bg-white/6 border-white/10 text-white'>
                <CardContent className='p-3'>
                  <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3'>
                    <div className='flex-1 min-w-0'>
                      <h1 className='text-xl font-bold truncate'>
                        {course?.title || 'Loading Course...'}
                      </h1>
                      <div className='flex items-center gap-2 text-sm text-white/70'>
                        <BookOpen className='w-4 h-4 flex-shrink-0' />
                        <span className='truncate'>
                          Topic {activeTopicIndex + 1} of {topics.length}
                        </span>
                      </div>
                    </div>

                    <div className='flex items-center gap-2 w-full sm:w-auto justify-end'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={restartTour}
                        className='gap-2 flex-1 sm:flex-initial'
                      >
                        <HelpCircle className='w-4 h-4' />
                        <span className='hidden sm:inline'>Help</span>
                      </Button>
                      <Button
                        onClick={toggleFull}
                        className='gap-2 flex-1 sm:flex-initial'
                        id='fullscreen-btn'
                      >
                        {isFullscreen ? (
                          <>
                            <Minimize2 className='w-4 h-4' />
                            <span className='hidden sm:inline'>
                              Exit Fullscreen
                            </span>
                            <span className='sm:hidden'>FS</span>
                          </>
                        ) : (
                          <>
                            <Maximize2 className='w-4 h-4' />
                            <span className='hidden sm:inline'>Fullscreen</span>
                            <span className='sm:hidden'>FS</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div
                    ref={viewerRef}
                    className='relative bg-black/50 rounded-xl overflow-hidden flex justify-center items-center'
                    style={{ minHeight: '70vh' }}
                  >
                    {isLocked && !userOwnsCourse && (
                      <div className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 backdrop-blur-md'>
                        <div className='text-center max-w-md bg-black/70 p-8 rounded-2xl border border-white/20'>
                          <div className='text-3xl font-bold mb-3'>
                            🔒 Premium Content
                          </div>
                          <div className='text-lg mb-4'>
                            Purchase to unlock full content and remove
                            watermarks
                          </div>
                          <div className='text-sm text-white/70 mb-6'>
                            Preview mode shows blurred content. Full purchase
                            includes:
                            <ul className='mt-2 space-y-1 text-left'>
                              <li>• High-quality, watermark-free content</li>
                              <li>• Downloadable PDF version</li>
                              <li>• Lifetime access with updates</li>
                              <li>• Priority support</li>
                            </ul>
                          </div>
                          <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                            <Button
                              onClick={() => navigate(`/payment/${courseId}`)}
                              className='bg-gradient-to-r from-[#22C3B3] to-[#1AA298] hover:opacity-90 px-6'
                            >
                              Buy Now - ₹{course?.price || 1499}
                            </Button>
                            <Button
                              variant='outline'
                              onClick={() => navigate('/courses')}
                            >
                              Browse Courses
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div
                      className={`relative z-10 w-full h-full flex items-center justify-center ${
                        isLocked ? 'filter blur-sm' : ''
                      }`}
                    >
                      {activeTopic ? (
                        <div
                          className='w-full h-full flex flex-col items-center justify-center p-2 md:p-4'
                          style={{ minHeight: '70vh' }}
                        >
                          {' '}
                          <TransformWrapper
                            initialScale={1}
                            wheel={{ step: 0.1 }}
                            doubleClick={{ disabled: true }}
                            pinch={{ step: 5 }}
                          >
                            <TransformComponent>
                              <div className='flex items-center justify-center'>
                                {activeTopic.images.map((imgUrl, idx) => {
                                  if (!shouldRenderImage(idx)) return null;

                                  const imgStyle: React.CSSProperties = {
                                    display:
                                      idx === currentPage ? 'block' : 'none',
                                    maxHeight: '70vh', // Increased from 45vh to 70vh
                                    width: 'auto',
                                    maxWidth: '90%', // Allow it to take more width
                                    objectFit: 'contain',
                                  };

                                  if (
                                    !userOwnsCourse &&
                                    course?.userHasAccess === false
                                  ) {
                                    imgStyle.filter =
                                      'blur(6px) grayscale(20%)';
                                    imgStyle.opacity = '0.8';
                                  }

                                  return (
                                    <img
                                      key={idx}
                                      src={imgUrl}
                                      alt={`Page ${idx + 1} - ${
                                        activeTopic.title
                                      }`}
                                      loading='lazy'
                                      style={imgStyle}
                                      className='rounded-lg shadow-2xl max-w-full'
                                      onContextMenu={(e) => e.preventDefault()}
                                      draggable={false}
                                    />
                                  );
                                })}
                              </div>
                            </TransformComponent>
                          </TransformWrapper>
                          {/* Watermark notice */}
                          {!userOwnsCourse &&
                            course?.userHasAccess === false && (
                              <div className='text-sm text-center mt-4 px-4 py-2 bg-yellow-900/30 rounded-lg border border-yellow-700/50'>
                                ⚠️ Preview Mode - Purchase to remove watermarks
                              </div>
                            )}
                          {/* Navigation controls - improved mobile layout */}
                          <div className='flex flex-col items-center gap-4 mt-6 w-full'>
                            <div
                              className='flex flex-col sm:flex-row items-center gap-4 w-full justify-center'
                              id='page-nav-buttons'
                            >
                              <Button
                                className='gap-2 bg-[#22C3B3] hover:bg-[#1AA298] w-full sm:w-auto sm:min-w-[120px]'
                                disabled={currentPage === 0}
                                onClick={() =>
                                  setCurrentPage((p) => Math.max(0, p - 1))
                                }
                              >
                                <ChevronLeft className='w-4 h-4' />
                                <span>Previous</span>
                              </Button>

                              <div className='flex flex-col items-center w-full sm:w-auto'>
                                <div className='text-sm font-medium'>
                                  Page {currentPage + 1} of {totalPages}
                                </div>
                                <div className='text-xs text-white/60 mt-1'>
                                  {getProgressStatus(
                                    progress[activeTopic._id] || 0
                                  )}
                                </div>
                                <div
                                  className='w-48 sm:w-48 bg-white/20 h-2 rounded-full mt-1 overflow-hidden'
                                  id='progress-indicator'
                                >
                                  <div
                                    style={{
                                      width: `${
                                        progress[activeTopic._id] || 0
                                      }%`,
                                    }}
                                    className='h-2 bg-gradient-to-r from-[#22C3B3] to-[#1AA298] transition-all duration-300'
                                  />
                                </div>
                              </div>

                              <Button
                                className='gap-2 bg-[#22C3B3] hover:bg-[#1AA298] w-full sm:w-auto sm:min-w-[120px]'
                                disabled={currentPage >= totalPages - 1}
                                onClick={() =>
                                  setCurrentPage((p) =>
                                    Math.min(totalPages - 1, p + 1)
                                  )
                                }
                              >
                                <span>Next</span>
                                <ChevronRight className='w-4 h-4' />
                              </Button>
                            </div>

                            {/* Additional action buttons - better mobile layout */}
                            <div className='flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto'>
                              {currentPage === totalPages - 1 &&
                                activeTopicIndex < topics.length - 1 && (
                                  <Button
                                    className='gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto'
                                    onClick={() => {
                                      setActiveTopicIndex(activeTopicIndex + 1);
                                      setCurrentPage(0);
                                      toast({
                                        title: '➡ Next Topic',
                                        description: `Now reading: ${
                                          topics[activeTopicIndex + 1]?.title
                                        }`,
                                      });
                                    }}
                                  >
                                    Next Topic →
                                  </Button>
                                )}

                              <Button
                                className='gap-2 border border-white/30 bg-white/10 hover:bg-white/20 w-full sm:w-auto sm:min-w-[150px]'
                                onClick={() =>
                                  markTopicComplete(activeTopic._id)
                                }
                                id='mark-complete-btn'
                              >
                                <CheckCircle className='w-4 h-4' />
                                <span className='truncate'>Mark Complete</span>
                              </Button>
                            </div>
                          </div>
                          {/* Notes section - improved mobile layout */}
                          <div
                            className='w-full max-w-2xl mt-8'
                            id='notes-section'
                          >
                            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2'>
                              <Label className='text-white/90 text-base font-medium'>
                                📝 Notes for Page {currentPage + 1}
                              </Label>
                              <div className='text-xs text-white/60'>
                                Auto-saves locally
                              </div>
                            </div>
                            <div className='flex flex-col sm:flex-row gap-3'>
                              <Input
                                value={
                                  (notes[activeTopic._id] &&
                                    notes[activeTopic._id][currentPage]) ||
                                  ''
                                }
                                onChange={(e) =>
                                  handleNoteChange(
                                    activeTopic._id,
                                    currentPage,
                                    e.target.value
                                  )
                                }
                                placeholder='Write your notes here...'
                                className='bg-white/10 border-white/20 text-white h-24 sm:h-20 resize-none flex-1'
                              />
                              <Button
                                onClick={() =>
                                  saveNote(activeTopic._id, currentPage)
                                }
                                disabled={loadingSave}
                                className='gap-2 bg-[#22C3B3] text-white h-12 sm:h-auto min-w-[100px]'
                              >
                                <Save className='w-4 h-4' />
                                {loadingSave ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                            <div className='text-xs mt-2 text-white/70 flex flex-col sm:flex-row gap-1 sm:gap-2'>
                              <span>💡 Tip: Note key concepts as you read</span>
                              <span className='hidden sm:inline'>•</span>
                              <span>Notes are saved per page</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className='flex flex-col items-center gap-4'>
                          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#22C3B3]'></div>
                          <div>Loading course content...</div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* SIDEBAR - Full width on mobile, 3 cols on desktop */}
            <aside className='col-span-12 md:col-span-3 order-2 md:order-2'>
              <div className='space-y-4'>
                {/* Topics Section - Always visible */}
                <Card
                  className='bg-white/6 border-white/10 text-white'
                  id='topics-sidebar'
                >
                  <CardContent className='p-4'>
                    <div className='flex justify-between items-center mb-4'>
                      <div className='font-bold text-lg'>Course Topics</div>
                      <div className='text-sm bg-[#22C3B3]/20 text-[#22C3B3] px-2 py-1 rounded-full'>
                        {topics.length} modules
                      </div>
                    </div>

                    <div className='space-y-3 max-h-[40vh] md:max-h-[65vh] overflow-y-auto pr-2'>
                      {topics.map((t, idx) => {
                        const percent = progress[t._id] || 0;
                        const active = idx === activeTopicIndex;
                        const completed = percent === 100;
                        return (
                          <div
                            key={t._id}
                            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                              active
                                ? 'bg-gradient-to-r from-[#22C3B3]/20 to-[#22C3B3]/10 border border-[#22C3B3]/30'
                                : 'bg-white/5 hover:bg-white/10'
                            }`}
                            onClick={() => {
                              setActiveTopicIndex(idx);
                              setCurrentPage(0);
                              toast({
                                title: `📘 ${t.title}`,
                                description: `Jumped to topic ${idx + 1} of ${
                                  topics.length
                                }`,
                                duration: 3000,
                              });
                            }}
                          >
                            <div className='flex items-start justify-between'>
                              <div className='font-medium text-white flex items-center gap-2'>
                                {completed && (
                                  <CheckCircle className='w-4 h-4 text-green-400' />
                                )}
                                <span className='truncate'>{t.title}</span>
                              </div>
                              <div
                                className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                                  completed
                                    ? 'bg-green-900/30 text-green-400'
                                    : percent > 0
                                    ? 'bg-blue-900/30 text-blue-400'
                                    : 'bg-white/10 text-white/70'
                                }`}
                              >
                                {percent}%
                              </div>
                            </div>
                            <div className='w-full bg-white/10 h-1.5 rounded-full mt-2 overflow-hidden'>
                              <div
                                style={{ width: `${percent}%` }}
                                className={`h-1.5 rounded-full ${
                                  completed
                                    ? 'bg-green-500'
                                    : 'bg-gradient-to-r from-[#22C3B3] to-[#1AA298]'
                                }`}
                              />
                            </div>
                            <div className='flex justify-between text-xs mt-2'>
                              <span className='text-white/60'>
                                {t.images.length} pages
                              </span>
                              <span
                                className={`${
                                  active ? 'text-[#22C3B3]' : 'text-white/50'
                                }`}
                              >
                                {idx + 1}/{topics.length}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Progress Summary Card - Always visible */}
                <Card
                  className='bg-gradient-to-br from-[#22C3B3]/10 to-[#1AA298]/5 border-[#22C3B3]/20'
                  id='overall-progress'
                >
                  <CardContent className='p-4'>
                    <div className='font-bold mb-3'>Overall Progress</div>
                    <div className='text-3xl font-bold mb-2'>
                      {weightedProgress}%
                    </div>
                    <div className='w-full bg-white/20 h-3 rounded-full overflow-hidden mb-3'>
                      <div
                        style={{ width: `${weightedProgress}%` }}
                        className='h-3 bg-gradient-to-r from-[#22C3B3] to-[#1AA298]'
                      />
                    </div>
                    <div className='text-sm text-white/80'>
                      {topics.filter((t) => progress[t._id] === 100).length} of{' '}
                      {topics.length} topics completed
                    </div>
                  </CardContent>
                </Card>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </EReaderSecurityWrapper>
  );
}
