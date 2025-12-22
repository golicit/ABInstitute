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
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const preloaded = useRef<Record<string, HTMLImageElement>>({}); // simple cache

  // NEW: per-topic set of viewed pages (stored in local state as Sets)
  const [viewedPages, setViewedPages] = useState<Record<string, Set<number>>>(
    {}
  );
  // NEW: completed topics persisted separately
  const [completedTopics, setCompletedTopics] = useState<
    Record<string, boolean>
  >({});

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
            title: 'Option Analysis Strategy by A. Bhattacharjee',
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
          title: 'Option Analysis Strategy by A. Bhattacharjee',
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

  const activeTopic = topics[activeTopicIndex];
  const totalPages = activeTopic?.images?.length ?? 0;

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

    // bookmarked page fallback already exists in your code

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

  // bookmark save (same as before)
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
    // optionally persist locally
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
    } else {
      toast({
        title: '🎉 Course Completed',
        description: 'You have finished all topics in this course.',
      });
    }
  };

  // Auto-complete when user reaches last page of a topic (mark complete but DO NOT auto-advance)
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
      toast({ title: 'Saved', description: 'Note saved to server.' });
    } catch {
      toast({ title: 'Saved locally', description: 'Note saved locally.' });
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
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Simple UI lock check
  const isLocked = !!course && course.userHasAccess === false;

  return (
    <EReaderSecurityWrapper>
      <main className='min-h-screen bg-gradient-to-br from-[#0b1f3a] to-[#090e1d] text-white p-4'>
        <div className='max-w-[1300px] mx-auto grid grid-cols-12 gap-4'>
          {/* MAIN READER (9 cols) */}
          <section className='col-span-12 md:col-span-9'>
            <Card className='bg-white/6 border-white/10 text-white'>
              <CardContent className='p-3'>
                <div className='flex items-center justify-between mb-3'>
                  <h2 className='text-xl font-semibold'>
                    {activeTopic?.title ?? 'Loading...'}
                  </h2>
                  <div className='flex items-center gap-2'>
                    <Button onClick={toggleFull}>
                      {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    </Button>
                  </div>
                </div>

                <div
                  ref={viewerRef}
                  className='relative bg-black/50 rounded overflow-hidden flex justify-center items-center'
                  style={{ minHeight: '65vh' }}
                >
                  {isLocked && (
                    <div className='absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 backdrop-blur-sm'>
                      <div className='text-center max-w-md'>
                        <div className='text-2xl font-bold'>Course locked</div>
                        <div className='text-sm mt-2'>
                          This course requires purchase to view content.
                        </div>
                      </div>
                      <div className='flex gap-3'>
                        <Button
                          onClick={() => navigate(`/payment/${courseId}`)}
                        >
                          Buy Course
                        </Button>
                        <Button
                          variant='ghost'
                          onClick={() => navigate('/dashboard')}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  <div
                    className={`relative z-10 w-full h-full flex items-center justify-center ${
                      isLocked ? 'filter blur-sm' : ''
                    }`}
                  >
                    {activeTopic ? (
                      <div className='w-full h-full flex flex-col items-center justify-center p-4'>
                        <TransformWrapper
                          initialScale={1}
                          wheel={{ step: 0.1 }}
                          doubleClick={{ disabled: true }}
                          pinch={{ step: 5 }}
                        >
                          <TransformComponent>
                            <div className='flex items-center justify-center'>
                              {activeTopic.images.map((imgUrl, idx) => {
                                if (!shouldRenderImage(idx))
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display:
                                          idx === currentPage
                                            ? 'block'
                                            : 'none',
                                      }}
                                    />
                                  );
                                return (
                                  <img
                                    key={idx}
                                    src={imgUrl}
                                    alt={`Page ${idx + 1}`}
                                    loading='lazy'
                                    style={{
                                      display:
                                        idx === currentPage ? 'block' : 'none',
                                      maxHeight: '75vh',
                                      width: 'auto',
                                      objectFit: 'contain',
                                    }}
                                    className='rounded shadow-lg'
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                  />
                                );
                              })}
                            </div>
                          </TransformComponent>
                        </TransformWrapper>

                        {/* controls */}
                        <div className='flex flex-wrap md:flex-nowrap items-center gap-3 mt-4 w-full justify-center md:justify-start'>
                          <Button
                            className='bg-[#F6A32F] hover:bg-[#d88c25] text-white font-semibold px-4 py-2 rounded-md w-full sm:w-auto'
                            disabled={currentPage === 0}
                            onClick={() =>
                              setCurrentPage((p) => Math.max(0, p - 1))
                            }
                          >
                            Prev
                          </Button>

                          <div className='text-sm'>
                            Page {currentPage + 1} / {totalPages || 0}
                          </div>

                          <Button
                            className='bg-[#F6A32F] hover:bg-[#d88c25] text-white font-semibold px-4 py-2 rounded-md w-full sm:w-auto'
                            disabled={currentPage >= totalPages - 1}
                            onClick={() =>
                              setCurrentPage((p) =>
                                Math.min(totalPages - 1, p + 1)
                              )
                            }
                          >
                            Next
                          </Button>

                          {/* Next Topic button (only on last page and when there is a next topic) */}
                          {currentPage === totalPages - 1 &&
                            activeTopicIndex < topics.length - 1 && (
                              <Button
                                className='bg-[#F6A32F] hover:bg-[#d88c25] text-white font-semibold px-4 py-2 rounded-md w-full sm:w-auto'
                                onClick={() => {
                                  setActiveTopicIndex(activeTopicIndex + 1);
                                  setCurrentPage(0);
                                }}
                              >
                                Next Topic →
                              </Button>
                            )}

                          <div className='w-full sm:w-auto'>
                            <div className='text-xs text-white/80'>
                              Topic progress:
                            </div>
                            <div className='w-44 bg-white/20 h-3 rounded mt-1 overflow-hidden'>
                              <div
                                style={{
                                  width: `${progress[activeTopic._id] || 0}%`,
                                }}
                                className='h-3 bg-[#F6A32F]'
                              />
                            </div>
                          </div>

                          <Button
                            className='ml-4 bg-transparent border border-white/20 text-white px-3 py-2 rounded-md'
                            onClick={() => markTopicComplete(activeTopic._id)}
                          >
                            Mark Topic Complete
                          </Button>
                        </div>

                        {/* notes */}
                        <div className='w-full mt-4'>
                          <Label className='text-white/90'>
                            Notes for this page
                          </Label>
                          <div className='flex gap-2 mt-2'>
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
                              placeholder='Write and save notes for this page...'
                              className='bg-white/5 text-white'
                            />
                            <Button
                              onClick={() =>
                                saveNote(activeTopic._id, currentPage)
                              }
                              disabled={loadingSave}
                              className='bg-[#F6A32F] text-white'
                            >
                              Save
                            </Button>
                          </div>
                          <div className='text-xs mt-2 text-white/70'>
                            Notes saved locally if backend unavailable.
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>Loading topic...</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* SIDEBAR (3 cols) */}
          <aside className='col-span-12 md:col-span-3'>
            <Card className='sticky top-6 bg-white/6 border-white/10 text-white'>
              <CardContent className='p-3 space-y-3 max-h-[80vh] overflow-y-auto'>
                <div className='flex justify-between items-center'>
                  <div className='font-semibold'>Topics</div>
                  <div className='text-xs text-white/80'>{topics.length}</div>
                </div>

                {topics.map((t, idx) => {
                  const percent = progress[t._id] || 0;
                  const active = idx === activeTopicIndex;
                  return (
                    <div
                      key={t._id}
                      className={`p-2 rounded-md cursor-pointer ${
                        active ? 'bg-white/10' : 'bg-white/5'
                      }`}
                      onClick={() => {
                        setActiveTopicIndex(idx);
                        setCurrentPage(0);
                      }}
                    >
                      <div className='flex justify-between'>
                        <div className='font-medium text-white'>{t.title}</div>
                        <div className='text-xs text-white/80'>{percent}%</div>
                      </div>
                      <div className='w-full bg-white/10 h-2 rounded mt-1 overflow-hidden'>
                        <div
                          style={{ width: `${percent}%` }}
                          className='h-2 bg-[#F6A32F]'
                        />
                      </div>
                      <div className='text-xs mt-1 text-white/70'>
                        {t.images.length} pages
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </EReaderSecurityWrapper>
  );
}
