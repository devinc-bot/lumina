import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { API_ROUTES } from '@repo/common'
import {
  USER_ROLE,
  type BuyerOrderSummaryResponse,
  type CreateOrderResponse,
  type JwtPayload,
  type PaginatedResponse,
} from '@repo/types'
import {
  createOrderSchema,
  listOrdersQuerySchema,
  uuidSchema,
  type CreateOrderInput,
  type ListOrdersQueryInput,
} from '@repo/validators'
import { ApiRateLimit } from '../../common/decorators/api-rate-limit.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRateLimit } from '../../common/decorators/user-rate-limit.decorator'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { UserRateLimitGuard } from '../../common/guards/user-rate-limit.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import { RATE_LIMIT_PROFILE } from '../../../config/rate-limit.policy'
import { CreatePendingOrderUseCase } from '../application/create-pending-order.use-case'
import { DeletePendingOrderUseCase } from '../application/delete-pending-order.use-case'
import { GetOrderByDocumentIdUseCase } from '../application/get-order-by-document-id.use-case'
import { ListMyOrdersUseCase } from '../application/list-my-orders.use-case'

@Controller(API_ROUTES.orders.prefix)
@ApiRateLimit(RATE_LIMIT_PROFILE.AUTHENTICATED)
export class OrdersController {
  constructor(
    @Inject(CreatePendingOrderUseCase)
    private readonly createPendingOrderUseCase: CreatePendingOrderUseCase,
    @Inject(GetOrderByDocumentIdUseCase)
    private readonly getOrderByDocumentIdUseCase: GetOrderByDocumentIdUseCase,
    @Inject(ListMyOrdersUseCase) private readonly listMyOrdersUseCase: ListMyOrdersUseCase,
    @Inject(DeletePendingOrderUseCase)
    private readonly deletePendingOrderUseCase: DeletePendingOrderUseCase
  ) {}

  @Get(API_ROUTES.orders.path.list())
  @Roles([USER_ROLE.USER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  list(
    @CurrentUser() user: JwtPayload,
    @Query(new ZodValidationPipe(listOrdersQuerySchema)) query: ListOrdersQueryInput
  ): Promise<PaginatedResponse<BuyerOrderSummaryResponse>> {
    return this.listMyOrdersUseCase.execute(user.sub, query)
  }

  @Delete(API_ROUTES.orders.path.delete(':documentId'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles([USER_ROLE.USER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  delete(
    @CurrentUser() user: JwtPayload,
    @Param('documentId', new ZodValidationPipe(uuidSchema)) documentId: string
  ): Promise<void> {
    return this.deletePendingOrderUseCase.execute(user.sub, documentId)
  }

  @Post(API_ROUTES.orders.path.create())
  @HttpCode(HttpStatus.CREATED)
  @Roles([USER_ROLE.USER])
  @UseGuards(JwtAuthGuard, RolesGuard, UserRateLimitGuard)
  @ApiRateLimit(RATE_LIMIT_PROFILE.PURCHASE)
  @UserRateLimit(RATE_LIMIT_PROFILE.PURCHASE)
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderInput
  ): Promise<CreateOrderResponse> {
    return this.createPendingOrderUseCase.execute(user.sub, body)
  }

  @Get(API_ROUTES.orders.path.get(':documentId'))
  @Roles([USER_ROLE.USER])
  @UseGuards(JwtAuthGuard, RolesGuard)
  get(
    @CurrentUser() user: JwtPayload,
    @Param('documentId', new ZodValidationPipe(uuidSchema)) documentId: string
  ): Promise<BuyerOrderSummaryResponse> {
    return this.getOrderByDocumentIdUseCase.execute(user.sub, documentId)
  }
}
