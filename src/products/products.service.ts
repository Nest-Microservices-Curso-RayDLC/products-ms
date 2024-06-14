import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.$connect();
    this.logger.log(`Database connected!`);
  }
  
  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto
    })
  }

  async findAll(pg: PaginationDto) {
    const total = await this.product.count({ where: { available: true } });
    const lastPage = Math.ceil(total / pg.limit);
    const data = await this.product.findMany({
      where: { available: true },
      skip: (pg.page - 1) * pg.limit,
      take: pg.limit,
    });
    return { data, meta: { total, page: pg.page, lastPage } };
  }

  async findOne(id: number) {
    const product = await this.product.findUnique({
      where: { id, available: true },
      select: {
        id: true,
        name: true,
        price: true,
        available: true
      }
    });
    if(!product) throw new RpcException({
      message: `Product with id ${id} not found.`,
      status: HttpStatus.BAD_REQUEST
    });
    return product;
  }

  async update({ id, ...dt }: UpdateProductDto) {
    if(Object.values(dt).every(val => !val)) return { message: 'No se envio informacion para actualizar.' }
    await this.findOne(id);
    return this.product.update({
      where: { id },
      data: dt
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const product = await this.product.update({
      where: { id },
      data: { available: false }
    });
    return product;
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));
    const products = await this.product.findMany({
      where : { id: { in: ids } }
    });
    if(products.length !== ids.length) throw new RpcException({
      message: `Some products were not found.`,
      status: HttpStatus.BAD_REQUEST
    });

    return products;
  }
}
