import { redirect } from 'next/navigation';

export default function CustomerLoginRedirect() {
  redirect('/signup');
}
