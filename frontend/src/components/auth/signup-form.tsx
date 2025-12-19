import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "../ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router-dom";

const signUpSchema = z
  .object({
    username: z.string().min(3, "Tên đăng nhập phải có ít nhất 3 ký tự"),
    email: z.email("Email không hợp lệ"),
    displayName: z.string().min(3, "Tên phải có ít nhất 3 kí tự"),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự"),
    rePassword: z.string().min(6, "Mật khẩu xác nhận phải có ít nhất 6 ký tự"),
  })
  .refine((data) => data.password === data.rePassword, {
    path: ["rePassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signUp } = useAuthStore();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpFormValues) => {
    const { username, email, password, displayName } = data;

    // Gọi Backend để SignUp
    await signUp(username, password, email, displayName);

    navigate("/signin");
  };

  return (
    <div
      className={cn("flex flex-col gap-6 items-center", className)}
      {...props}
    >
      <Card className="w-full max-w-md overflow-hidden border-border shadow-xl rounded-2xl">
        <CardContent>
          <form className="p-4 md:p-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              {/* header - logo */}
              <div className="flex flex-col items-center text-center gap-2">
                <a href="/" className="mx-auto block w-fit text-center">
                  <img
                    src=".\src\assets\Logo.png"
                    alt="logo"
                    className="w-[120px] h-[120px]"
                  />
                </a>

                <h1 className="text-2xl font-bold">Tạo tài khoản</h1>

                <p className="text-sm">
                  Chào mừng bạn! Hãy đăng ký để bắt đầu!
                </p>
              </div>

              {/* === EMAIL === */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="email" className="block text-sm">
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="mail@gmail.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* === USERNAME === */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="username" className="block text-sm">
                  Tên đăng nhập
                </Label>
                <Input
                  type="text"
                  id="username"
                  placeholder="John Cena"
                  {...register("username")}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* === DISPLAYNAME=== */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="displayName" className="block text-sm">
                  Tên hiển thị
                </Label>
                <Input
                  type="text"
                  id="displayName"
                  placeholder="John Cena"
                  {...register("displayName")}
                />
                {errors.username && (
                  <p className="text-destructive text-sm">
                    {errors.username.message}
                  </p>
                )}
              </div>

              {/* === PASSWORD === */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="password" className="block text-sm">
                  Mật khẩu
                </Label>
                <Input
                  type="password"
                  id="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* === RE-PASSWORD=== */}
              <div className="flex flex-col gap-3">
                <Label htmlFor="re-password" className="block text-sm">
                  Confirm Password
                </Label>
                <Input
                  id="rePassword"
                  type="password"
                  {...register("rePassword")}
                />
                {errors.password && (
                  <p className="text-destructive text-sm">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* === SUBMIT BUTTON === */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                Tạo tài khoản
              </Button>

              {/* === FOOTER === */}
              <div className="text-center">
                Đã có tài khoản?{" "}
                <a href="/signin" className="underline underline-offset-4">
                  Đăng nhập
                </a>
              </div>
            </div>
          </form>

          {/* === IMAGE SIDE === */}
          <div className="relative hidden md:block ">
            <img
              src="/placeholder.svg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover opacity-60"
            />
          </div>
        </CardContent>
      </Card>

      <div className=" text-xs text-balance px-6 text-center *:[a]:hover:text-primary text-muted-foreground *:[a]:underline *:[a]:underline-offetset-4">
        Bằng cách tiếp tục, bạn đồng ý với <a href="#">Điều khoản dịch vụ</a> và{" "}
        <a href="#">Chính sách bảo mật</a> của chúng tôi.
      </div>
    </div>
  );
}