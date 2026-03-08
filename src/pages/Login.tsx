import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Building2 } from "lucide-react";
import { FaGoogle, FaApple, FaFacebook } from "react-icons/fa";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      navigate("/");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 to-black"></div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Logo section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-4 rounded-full bg-white">
              <Building2 className="w-12 h-12 text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">Millions of insights.</h1>
          <h2 className="text-4xl font-bold mb-6">Free on Meilleur.</h2>
        </div>

        {/* Social login buttons */}
        <div className="space-y-4 mb-8">
          <Button 
            variant="secondary" 
            className="w-full h-14 bg-green-500 hover:bg-green-600 text-black font-semibold text-lg rounded-full border-0"
            disabled
          >
            Sign up free
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 bg-transparent border-gray-600 hover:bg-gray-800 text-white font-medium rounded-full flex items-center gap-3"
            disabled
          >
            <FaGoogle className="w-5 h-5" />
            Continue with Google
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 bg-transparent border-gray-600 hover:bg-gray-800 text-white font-medium rounded-full flex items-center gap-3"
            disabled
          >
            <FaFacebook className="w-5 h-5 text-blue-500" />
            Continue with Facebook
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full h-14 bg-transparent border-gray-600 hover:bg-gray-800 text-white font-medium rounded-full flex items-center gap-3"
            disabled
          >
            <FaApple className="w-5 h-5" />
            Continue with Apple
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-8">
          <hr className="border-gray-600" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black px-4 text-gray-400 text-sm">
            or
          </span>
        </div>

        {/* Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-gray-900 border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:border-white focus:ring-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 bg-gray-900 border-gray-600 rounded-md text-white placeholder:text-gray-400 focus:border-white focus:ring-white"
            />
          </div>
          <Button 
            type="submit" 
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-black font-semibold rounded-full mt-6" 
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Log In
          </Button>
        </form>

        <div className="text-center mt-6">
          <Link 
            to="/forgot-password" 
            className="text-white hover:text-green-400 underline text-sm"
          >
            Forgot your password?
          </Link>
        </div>

        {/* Demo credentials */}
        <div className="mt-8 p-4 bg-gray-900/50 rounded-lg text-center">
          <p className="text-gray-400 text-sm">Demo credentials:</p>
          <p className="text-gray-300 text-sm">admin@meilleur.com / admin123</p>
        </div>

        {/* Sign up link */}
        <div className="text-center mt-8 pb-8">
          <span className="text-gray-400">Don't have an account? </span>
          <Link to="/register" className="text-white hover:text-green-400 underline font-medium">
            Sign up for Meilleur
          </Link>
        </div>
      </div>
    </div>
  );
}