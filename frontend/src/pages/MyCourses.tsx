// src/pages/MyCourses.tsx
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const MyCourses = () => {
  const { courses } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const enrolledCourses = courses.filter((c) => c.isEnrolled);
  const filteredCourses = enrolledCourses.filter((course) => {
    if (filter === 'active')
      return course.progress > 0 && course.progress < 100;
    if (filter === 'completed') return course.progress === 100;
    return true;
  });

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>My Courses</h1>
          <p className='text-muted-foreground'>
            Track your progress and continue learning
          </p>
        </div>

        <div className='flex gap-2'>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
            size='sm'
            className='text-black'
          >
            All ({enrolledCourses.length})
          </Button>

          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            onClick={() => setFilter('active')}
            size='sm'
            className='text-black'
          >
            Active
          </Button>

          <Button
            variant={filter === 'completed' ? 'default' : 'outline'}
            onClick={() => setFilter('completed')}
            size='sm'
            className='text-black'
          >
            Completed
          </Button>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <BookOpen className='mb-4 h-16 w-16 text-muted-foreground' />
            <h3 className='mb-2 text-xl font-semibold'>No courses found</h3>
            <p className='mb-4 text-muted-foreground'>
              {filter === 'all'
                ? "You haven't enrolled in any courses yet"
                : `No ${filter} courses at the moment`}
            </p>
            <Button onClick={() => navigate('/dashboard/explore')}>
              Explore Courses
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {filteredCourses.map((course) => (
            <Card
              key={course.id}
              className='group overflow-hidden transition-all hover:shadow-lg'
            >
              <div className='relative aspect-video w-full overflow-hidden bg-muted'>
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className='h-full w-full object-cover transition-transform group-hover:scale-105'
                />
                <div className='absolute inset-0 flex items-center justify-center bg-background/20 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100'>
                  <PlayCircle className='h-16 w-16 text-primary-foreground' />
                </div>
              </div>

              <CardHeader>
                <div className='mb-2 flex items-center gap-2'>
                  <Badge variant='secondary' className='text-xs'>
                    {course.category}
                  </Badge>
                  {course.progress === 100 && (
                    <Badge className='bg-success text-xs'>Completed</Badge>
                  )}
                </div>
                <CardTitle className='line-clamp-2'>{course.title}</CardTitle>
                <p className='text-sm text-muted-foreground'>
                  {course.instructor}
                </p>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1'>
                    <Clock className='h-4 w-4' />
                    <span>{course.duration}</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <BookOpen className='h-4 w-4' />
                    <span>{course.lessonsCount} lessons</span>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-between text-sm'>
                    <span className='text-muted-foreground'>Progress</span>
                    <span className='font-medium'>{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className='h-2' />
                </div>

                <Button
                  className='w-full'
                  onClick={() => navigate(`/dashboard/course/${course.id}`)}
                >
                  {course.progress === 0
                    ? 'Start Course'
                    : course.progress === 100
                    ? 'Review Course'
                    : 'Continue Learning'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
