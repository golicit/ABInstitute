import { useNavigate } from 'react-router-dom';
import { MentorshipSection } from '../components/mentorship-section';

export default function ExplorePage() {
  const navigate = useNavigate();

  return (
    <main className='min-h-screen'>
      <MentorshipSection />
    </main>
  );
}
