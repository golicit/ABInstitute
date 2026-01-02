'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Video, Zap, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MentorshipSection() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const classModules = [
    {
      id: 'live',
      title: 'Live Recording',
      icon: Video,
      description:
        'Access our exclusive library of high-impact live session recordings.',
      data: [
        '50+ hours of session archives',
        'Real-time trade breakdowns',
        'Q&A session highlights',
      ],
    },
    {
      id: 'hybrid',
      title: 'Hybrid Path',
      icon: Zap,
      description:
        'A blended learning experience combining live interaction with self-paced study.',
      data: [
        'Weekly live mentorship',
        'Progress-tracking dashboard',
        'Community peer reviews',
      ],
    },
  ];

  return (
    <div className='space-y-10'>
      {/* Content Area */}
      <div className='space-y-8 max-w-[1200px]'>
        <div className='space-y-1'>
          <h1 className='text-3xl font-bold text-white'>Explore Courses</h1>
          <p className='text-muted-foreground'>
            Discover specialized mentorship paths tailored for your growth
          </p>
        </div>
      </div>
      {/* Mentor Banner */}
      <div className='relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#111827] to-[#0a0e14] border border-border/40 p-8 flex flex-col md:flex-row gap-12'>
        {/* Text Section */}
        <div className='relative z-10 flex-1 space-y-4 flex flex-col justify-center'>
          <Badge className='bg-[#14b8a6]/20 text-[#14b8a6] border-none w-fit'>
            Main Mentor
          </Badge>

          <div className='space-y-1'>
            <h2 className='text-3xl font-bold text-white tracking-tight'>
              Akash Bhattacharjee
            </h2>
            <p className='text-[#14b8a6] font-medium text-lg'>
              Market Research Specialist & Trading Mentor
            </p>
          </div>

          <p className='text-muted-foreground max-w-xl text-balance'>
            With years of experience in market analysis, Akash helps traders
            navigate complexity with a focus on sustainable growth and risk
            management.
          </p>

          <div className='flex gap-4 pt-2'>
            <Button className='bg-[#14b8a6] hover:bg-[#0d9488] text-white rounded-full px-6'>
              Follow Mentor
            </Button>
            <Button
              variant='outline'
              className='rounded-full border-border/60 bg-transparent'
            >
              View Profile
            </Button>
          </div>
        </div>

        {/* Image Section */}
        <div className='relative shrink-0'>
          <img
            src='/cover.jpeg'
            alt='Akash Bhattacharjee'
            className='
        w-[280px]
        md:w-[300px]
        lg:w-[320px]
        h-auto
        object-contain
        rounded-2xl
        border border-border/40
      '
          />

          {/* Gradient overlay */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-2xl' />
        </div>

        {/* Decorative glow */}
        <div className='absolute -right-20 -top-20 w-64 h-64 bg-[#14b8a6]/5 blur-3xl rounded-full pointer-events-none' />
      </div>

      {/* Class Structure Sections */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {classModules.map((module) => (
          <Card
            key={module.id}
            className={cn(
              'bg-[#111827] border-border/40 transition-all duration-300 overflow-hidden cursor-pointer',
              expandedId === module.id
                ? 'ring-1 ring-[#14b8a6]/50'
                : 'hover:border-[#14b8a6]/30'
            )}
            onClick={() => toggleExpand(module.id)}
          >
            <CardContent className='p-6'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-4'>
                  <div className='w-12 h-12 rounded-xl bg-[#14b8a6]/10 flex items-center justify-center shrink-0'>
                    <module.icon className='w-6 h-6 text-[#14b8a6]' />
                  </div>
                  <div>
                    <h3 className='text-xl font-bold text-white'>
                      {module.title}
                    </h3>
                    <p className='text-sm text-muted-foreground mt-1'>
                      {module.description}
                    </p>
                  </div>
                </div>
                {expandedId === module.id ? (
                  <ChevronUp className='w-5 h-5 text-muted-foreground' />
                ) : (
                  <ChevronDown className='w-5 h-5 text-muted-foreground' />
                )}
              </div>

              {expandedId === module.id && (
                <div className='mt-6 pt-6 border-t border-border/20 grid grid-cols-1 gap-3 animate-in fade-in slide-in-from-top-2'>
                  {module.data.map((item, idx) => (
                    <div
                      key={idx}
                      className='flex items-center gap-3 text-sm text-white/90'
                    >
                      <CheckCircle2 className='w-4 h-4 text-[#14b8a6]' />
                      {item}
                    </div>
                  ))}
                  <Button className='w-full mt-4 bg-[#14b8a6] hover:bg-[#0d9488] text-white'>
                    Enroll in This Path
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
