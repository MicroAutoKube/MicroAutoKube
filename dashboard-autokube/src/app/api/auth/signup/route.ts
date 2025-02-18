

import { prisma , bcrypt } from '@/lib'

interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

interface SignupResponse {
  message?: string;
  user?: any;
  error?: string;
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { email, password, name }: SignupRequest = await request.json();
    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });
    const response: SignupResponse = { message: 'User created', user };
    return Response.json(response);
  } catch (error) {
    const response: SignupResponse = { error: 'User could not be created' };
    return Response.json(response);
  }
}