import { motion } from 'framer-motion';

export default function Login() {
  return (
    <section className="container py-20">
      <motion.div 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-lg mx-auto glass rounded-2xl p-8"
      >
        <h1 className="h-section">Login</h1>
        <p className="text-white/70 mt-2">We'll email you a secure sign-in link.</p>
        {/* Add your login form components here */}
      </motion.div>
    </section>
  );
}



