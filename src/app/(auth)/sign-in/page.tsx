import AuthForm from '@/components/auth/AuthForm'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#040417] text-white">  
      <div className="text-center space-y-2 mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">Welcome back, visionary.</h1>
        <p className="text-gray-400">Sign in to access your personal AI experience.</p>
      </div>
      <AuthForm mode="sign-in" />
      <div className="mt-4 text-sm text-gray-400 text-center space-y-1">
        <p>Don't have an account? <a href="/sign-up" className="text-blue-500 hover:underline">Create one</a></p>
        <p><a href="/forgot-password" className="text-blue-500 hover:underline">Forgot password?</a></p>
      </div>
      <p className="mt-8 text-xs text-center text-gray-500">
        Quirra is your space — secure, private, and built just for you.
      </p>
    </div>
  )
}